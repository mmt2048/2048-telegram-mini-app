import { TableAggregate } from "@convex-dev/aggregate";
import { v } from "convex/values";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { DataModel, Id } from "./_generated/dataModel";
import { components, internal } from "./_generated/api";
import { awardEligiblePromocodes } from "./promocodes";
import { Triggers } from "convex-helpers/server/triggers";
import { Migrations } from "@convex-dev/migrations";
import {
    customCtx,
    customMutation,
} from "convex-helpers/server/customFunctions";
import {
    aggregateUserTotalsByDailyBestScore,
    aggregateUserTotalsByTotalScore,
    addFinishedScoreToTotals,
    getUserTotalsByUserId,
} from "./userTotals";

const triggers = new Triggers<DataModel>();
triggers.register(
    "userTotals",
    aggregateUserTotalsByDailyBestScore.idempotentTrigger()
);
triggers.register(
    "userTotals",
    aggregateUserTotalsByTotalScore.idempotentTrigger()
);
const mutationWithTriggers = customMutation(
    mutation,
    customCtx(triggers.wrapDB)
);

export const startNewGame = mutationWithTriggers({
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

export const setGameScore = mutationWithTriggers({
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

export const finishGame = mutationWithTriggers({
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
