import { v } from "convex/values";
import { query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getUserByTelegramUser } from "./users";

type Scope = "global" | "friends";
type RatingType = "daily" | "total";

type RatingRow = {
    user_id: number;
    user_nickname?: string;
    score: number;
    place: number;
    // Internal field used only for computation, stripped from the response
    _userConvexId?: Id<"users">;
};

export const getRating = query({
    args: {
        telegramUser: v.any(),
        type: v.union(v.literal("daily"), v.literal("total")),
        scope: v.union(v.literal("global"), v.literal("friends")),
        limit: v.number(),
    },
    handler: async (ctx, args) => {
        const currentUser = await getUserByTelegramUser(ctx, args.telegramUser);

        const candidateUsers = await getCandidateUsers(
            ctx,
            args.scope,
            currentUser?._id ?? null
        );

        const rows = await computeScores(ctx, candidateUsers, args.type);

        // Sort by score desc and assign places (1-based)
        rows.sort((a, b) => b.score - a.score);
        rows.forEach((row, index) => (row.place = index + 1));

        // Take top N and include current user if outside top
        const top = rows.slice(0, Math.max(0, args.limit));

        if (currentUser) {
            const myIndex = rows.findIndex(
                (r) => r._userConvexId === currentUser._id
            );
            if (myIndex >= args.limit && myIndex !== -1) {
                top.push(rows[myIndex]);
            }
        }

        // Strip internal field before returning
        return top.map(({ _userConvexId, ...rest }) => rest);
    },
});

async function getCandidateUsers(
    ctx: QueryCtx,
    scope: Scope,
    currentUserId: Id<"users"> | null
) {
    if (scope === "friends") {
        if (!currentUserId) throw new Error("User not found");

        const asUser1 = await ctx.db
            .query("friendships")
            .withIndex("by_user1", (q: any) => q.eq("user1Id", currentUserId))
            .collect();
        const asUser2 = await ctx.db
            .query("friendships")
            .withIndex("by_user2", (q: any) => q.eq("user2Id", currentUserId))
            .collect();

        const friendIds = new Set<Id<"users">>([
            currentUserId,
            ...asUser1.map((doc: any) => doc.user2Id),
            ...asUser2.map((doc: any) => doc.user1Id),
        ]);

        const users = await Promise.all(
            Array.from(friendIds).map((id) => ctx.db.get(id))
        );
        return users.filter((u): u is NonNullable<typeof u> => !!u);
    }

    // Global scope: all users
    return await ctx.db.query("users").collect();
}

async function computeScores(
    ctx: QueryCtx,
    users: Array<{
        _id: Id<"users">;
        telegramId: number;
        nickname?: string;
    }>,
    type: RatingType
): Promise<RatingRow[]> {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const result: RatingRow[] = [];
    for (const user of users) {
        const games = await ctx.db
            .query("games")
            .withIndex("by_user", (q: any) => q.eq("userId", user._id))
            .collect();

        if (type === "daily") {
            const recent = games.filter(
                (g: any) => (g.updatedAt ?? g._creationTime) >= dayAgo
            );
            if (recent.length === 0) continue;
            const score = recent.reduce(
                (max: number, g: any) => (g.score > max ? g.score : max),
                0
            );
            result.push({
                user_id: user.telegramId,
                user_nickname: user.nickname,
                score,
                place: 0,
                _userConvexId: user._id,
            });
        } else {
            if (games.length === 0) continue;
            const score = games.reduce(
                (sum: number, g: any) => sum + g.score,
                0
            );
            result.push({
                user_id: user.telegramId,
                user_nickname: user.nickname,
                score,
                place: 0,
                _userConvexId: user._id,
            });
        }
    }

    return result;
}
