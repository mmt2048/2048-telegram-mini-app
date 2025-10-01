import { v } from "convex/values";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { awardEligiblePromocodes } from "./promocodes";

export const startNewGame = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        return createNewGame(ctx, args.userId);
    },
});

export const getInProgressGame = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        return await getInProgressGameByUserId(ctx, args.userId);
    },
});

export const setGameScore = mutation({
    args: {
        userId: v.id("users"),
        score: v.number(),
    },
    handler: async (ctx, args) => {
        const inProgressGame = await getInProgressGameByUserId(
            ctx,
            args.userId
        );

        if (!inProgressGame) return createNewGame(ctx, args.userId, args.score);

        // Monotonic guard: never decrease score due to out-of-order or spammy updates
        if (args.score <= inProgressGame.score) {
            return;
        }

        await ctx.db.patch(inProgressGame._id, {
            score: args.score,
            updatedAt: Date.now(),
        });

        try {
            const totals = await getUserTotalsByUserId(ctx, args.userId);
            const recordCandidate = Math.max(
                totals?.recordScore ?? 0,
                args.score
            );
            const totalCandidate = (totals?.totalScore ?? 0) + args.score;

            await awardEligiblePromocodes(ctx, args.userId, {
                recordScore: recordCandidate,
                totalScore: totalCandidate,
            });
        } catch (e) {
            console.error("awardEligiblePromocodes(setGameScore)", e);
        }
    },
});

export const finishGame = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const inProgressGame = await getInProgressGameByUserId(
            ctx,
            args.userId
        );

        if (!inProgressGame) return createNewGame(ctx, args.userId);

        await ctx.db.patch(inProgressGame._id, {
            status: "finished",
            updatedAt: Date.now(),
        });

        // Incrementally update totals and award any missed promocodes
        try {
            await addFinishedScoreToTotals(
                ctx,
                args.userId,
                inProgressGame.score
            );
            const totals = await getUserTotalsByUserId(
                ctx as unknown as QueryCtx,
                args.userId
            );
            if (totals) {
                await awardEligiblePromocodes(
                    ctx as unknown as MutationCtx,
                    args.userId,
                    {
                        recordScore: totals.recordScore,
                        totalScore: totals.totalScore,
                    }
                );
            }
        } catch (e) {
            console.error("awardEligiblePromocodes(finishGame)", e);
        }
    },
});

export const getRecordScore = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const finishedGames = await ctx.db
            .query("games")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
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
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const finishedGames = await ctx.db
            .query("games")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
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

async function getUserTotalsByUserId(
    ctx: QueryCtx | MutationCtx,
    userId: Id<"users">
) {
    return await ctx.db
        .query("userTotals")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
}

function getTodayDateKey(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

async function addFinishedScoreToTotals(
    ctx: MutationCtx,
    userId: Id<"users">,
    finishedScore: number
) {
    const existing = await getUserTotalsByUserId(
        ctx as unknown as QueryCtx,
        userId
    );
    const todayKey = getTodayDateKey();

    if (!existing) {
        await ctx.db.insert("userTotals", {
            userId,
            totalScore: finishedScore,
            recordScore: finishedScore,
            negTotalScore: -finishedScore,
            dailyBestScore: finishedScore,
            negDailyBestScore: -finishedScore,
            dailyResetDate: todayKey,
            updatedAt: Date.now(),
        });
        return;
    }

    const nextRecord =
        existing.recordScore < finishedScore
            ? finishedScore
            : existing.recordScore;

    // Reset daily best if date changed
    let dailyBest = existing.dailyBestScore ?? 0;
    if (existing.dailyResetDate !== todayKey) {
        dailyBest = finishedScore;
    } else {
        dailyBest = Math.max(dailyBest, finishedScore);
    }

    await ctx.db.patch(existing._id, {
        totalScore: existing.totalScore + finishedScore,
        recordScore: nextRecord,
        negTotalScore: -(existing.totalScore + finishedScore),
        dailyBestScore: dailyBest,
        negDailyBestScore: -dailyBest,
        dailyResetDate: todayKey,
        updatedAt: Date.now(),
    });
}
