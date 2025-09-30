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

type UserTotals = {
    userId: Id<"users">;
    totalScore: number;
    dailyBestScore: number;
    [key: string]: any;
};

type User = {
    _id: Id<"users">;
    _creationTime: number;
    telegramId: number;
    username: string;
    firstName: string;
    lastName: string;
    nickname: string;
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

        let rows: RatingRow[];

        if (args.scope === "global") {
            rows = await getGlobalRating(
                ctx,
                args.type,
                args.limit,
                currentUser?._id ?? null
            );
        } else {
            rows = await getFriendsRating(
                ctx,
                args.type,
                currentUser?._id ?? null
            );
        }

        // Sort by score descending and assign places (1-based)
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

// ============================================================================
// Global Rating (uses indexed top-N queries)
// ============================================================================

async function getGlobalRating(
    ctx: QueryCtx,
    type: RatingType,
    limit: number,
    currentUserId: Id<"users"> | null
): Promise<RatingRow[]> {
    const indexName =
        type === "total" ? "by_negTotalScore" : "by_negDailyBestScore";
    const scoreField = type === "total" ? "totalScore" : "dailyBestScore";

    // Fetch top N by score
    const topTotals = await ctx.db
        .query("userTotals")
        .withIndex(indexName)
        .take(limit);

    const rows = await buildRatingRows(ctx, topTotals, scoreField);

    // Add current user if not in top N
    if (currentUserId && rows.every((r) => r._userConvexId !== currentUserId)) {
        const currentUserRow = await fetchCurrentUserRow(
            ctx,
            currentUserId,
            scoreField
        );
        if (currentUserRow) {
            rows.push(currentUserRow);
        }
    }

    return rows;
}

// ============================================================================
// Friends Rating (fetches totals for each friend)
// ============================================================================

async function getFriendsRating(
    ctx: QueryCtx,
    type: RatingType,
    currentUserId: Id<"users"> | null
): Promise<RatingRow[]> {
    if (!currentUserId) throw new Error("User not found");

    const scoreField = type === "total" ? "totalScore" : "dailyBestScore";

    // Get all friend user IDs (including current user)
    const friendUsers = await getFriendUsers(ctx, currentUserId);

    // Fetch totals for all friends in parallel
    const totals = await Promise.all(
        friendUsers.map((u) =>
            ctx.db
                .query("userTotals")
                .withIndex("by_user", (q) => q.eq("userId", u._id))
                .first()
        )
    );

    // Build rows for friends with scores > 0
    const rows: RatingRow[] = [];
    for (let i = 0; i < friendUsers.length; i++) {
        const user = friendUsers[i];
        const userTotals = totals[i] as UserTotals | null;
        const score = userTotals?.[scoreField] ?? 0;

        if (score > 0) {
            rows.push(createRatingRow(user, score));
        }
    }

    return rows;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getFriendUsers(
    ctx: QueryCtx,
    currentUserId: Id<"users">
): Promise<User[]> {
    const [asUser1, asUser2] = await Promise.all([
        ctx.db
            .query("friendships")
            .withIndex("by_user1", (q) => q.eq("user1Id", currentUserId))
            .collect(),
        ctx.db
            .query("friendships")
            .withIndex("by_user2", (q) => q.eq("user2Id", currentUserId))
            .collect(),
    ]);

    const friendIds = new Set<Id<"users">>([
        currentUserId,
        ...asUser1.map((doc) => doc.user2Id),
        ...asUser2.map((doc) => doc.user1Id),
    ]);

    const users = await Promise.all(
        Array.from(friendIds).map((id) => ctx.db.get(id))
    );

    return users.filter((u): u is User => !!u);
}

async function buildRatingRows(
    ctx: QueryCtx,
    userTotalsArray: any[],
    scoreField: string
): Promise<RatingRow[]> {
    const userIds = userTotalsArray.map((t) => t.userId);
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const usersMap = new Map(users.filter(Boolean).map((u: any) => [u._id, u]));

    const rows: RatingRow[] = [];
    for (const userTotals of userTotalsArray) {
        const score = userTotals[scoreField] ?? 0;
        if (score === 0) continue;

        const user = usersMap.get(userTotals.userId);
        if (!user) continue;

        rows.push(createRatingRow(user as User, score));
    }

    return rows;
}

async function fetchCurrentUserRow(
    ctx: QueryCtx,
    userId: Id<"users">,
    scoreField: string
): Promise<RatingRow | null> {
    const [userTotals, user] = await Promise.all([
        ctx.db
            .query("userTotals")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first(),
        ctx.db.get(userId),
    ]);

    if (!userTotals || !user) return null;

    const score = (userTotals as any)[scoreField] ?? 0;
    if (score === 0) return null;

    return createRatingRow(user, score);
}

function createRatingRow(user: User, score: number): RatingRow {
    return {
        user_id: user.telegramId,
        user_nickname: user.nickname,
        score,
        place: 0,
        _userConvexId: user._id,
    };
}
