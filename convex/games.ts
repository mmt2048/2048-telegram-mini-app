import { v } from "convex/values";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getOrCreateUserByTelegramUser, getUserByTelegramUser } from "./users";
import { awardEligiblePromocodes } from "./promocodes";

export const startNewGame = mutation({
    args: {
        telegramUser: v.any(),
    },
    handler: async (ctx, args) => {
        const user = await getOrCreateUserByTelegramUser(
            ctx,
            args.telegramUser
        );
        if (!user) throw new Error("User not found");

        return createNewGame(ctx, user._id);
    },
});

export const getInProgressGame = query({
    args: {
        telegramUser: v.any(),
    },
    handler: async (ctx, args) => {
        const user = await getUserByTelegramUser(ctx, args.telegramUser);
        if (!user) throw new Error("User not found");

        return await getInProgressGameByUserId(ctx, user._id);
    },
});

export const setGameScore = mutation({
    args: {
        telegramUser: v.any(),
        score: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await getOrCreateUserByTelegramUser(
            ctx,
            args.telegramUser
        );
        if (!user) throw new Error("User not found");

        const inProgressGame = await getInProgressGameByUserId(ctx, user._id);

        if (!inProgressGame) return createNewGame(ctx, user._id, args.score);

        // Monotonic guard: never decrease score due to out-of-order or spammy updates
        if (args.score <= inProgressGame.score) {
            return;
        }

        await ctx.db.patch(inProgressGame._id, {
            score: args.score,
            updatedAt: Date.now(),
        });

        // Auto-award promocodes for thresholds that depend on current and total scores
        try {
            const finishedGames = await ctx.db
                .query("games")
                .withIndex("by_user", (q) => q.eq("userId", user._id))
                .collect();
            const recordFinished = finishedGames.reduce(
                (max, g) => (g.score > max ? g.score : max),
                0
            );
            const totalFinished = finishedGames.reduce(
                (sum, g) => sum + g.score,
                0
            );
            const recordCandidate = Math.max(recordFinished, args.score);
            const totalCandidate = totalFinished + args.score; // include current in-progress score

            await awardEligiblePromocodes(ctx, user._id, {
                recordScore: recordCandidate,
                totalScore: totalCandidate,
            });
        } catch (e) {
            // Do not fail score updates if awarding fails; log instead
            console.error("awardEligiblePromocodes(setGameScore)", e);
        }
    },
});

export const finishGame = mutation({
    args: {
        telegramUser: v.any(),
    },
    handler: async (ctx, args) => {
        const user = await getOrCreateUserByTelegramUser(
            ctx,
            args.telegramUser
        );
        if (!user) throw new Error("User not found");

        const inProgressGame = await getInProgressGameByUserId(ctx, user._id);

        if (!inProgressGame) return createNewGame(ctx, user._id);

        await ctx.db.patch(inProgressGame._id, {
            status: "finished",
            updatedAt: Date.now(),
        });

        // Recompute total and record and award any missed promocodes
        try {
            const finishedGames = await ctx.db
                .query("games")
                .withIndex("by_user", (q) => q.eq("userId", user._id))
                .collect();
            const record = finishedGames.reduce(
                (max, g) => (g.score > max ? g.score : max),
                0
            );
            const total = finishedGames.reduce((sum, g) => sum + g.score, 0);
            await awardEligiblePromocodes(
                ctx as unknown as MutationCtx,
                user._id,
                {
                    recordScore: record,
                    totalScore: total,
                }
            );
        } catch (e) {
            console.error("awardEligiblePromocodes(finishGame)", e);
        }
    },
});

export const getRecordScore = query({
    args: {
        telegramUser: v.any(),
    },
    handler: async (ctx, args) => {
        const user = await getUserByTelegramUser(ctx, args.telegramUser);
        if (!user) throw new Error("User not found");

        const finishedGames = await ctx.db
            .query("games")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        if (finishedGames.length === 0) return 0;
        return finishedGames.reduce(
            (max, g) => (g.score > max ? g.score : max),
            0
        );
    },
});

export const getTotalScore = query({
    args: {
        telegramUser: v.any(),
    },
    handler: async (ctx, args) => {
        const user = await getUserByTelegramUser(ctx, args.telegramUser);
        if (!user) throw new Error("User not found");

        const finishedGames = await ctx.db
            .query("games")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        return finishedGames.reduce((sum, g) => sum + g.score, 0);
    },
});

export async function createNewGame(
    ctx: MutationCtx,
    userId: Id<"users">,
    score: number = 0
) {
    return await ctx.db.insert("games", {
        userId: userId,
        score: score,
        status: "in_progress",
        updatedAt: Date.now(),
    });
}

export async function getInProgressGameByUserId(
    ctx: QueryCtx,
    userId: Id<"users">
) {
    const game = await ctx.db
        .query("games")
        .withIndex("by_user_and_status", (q) =>
            q.eq("userId", userId).eq("status", "in_progress")
        )
        .first();
    return game ?? null;
}
