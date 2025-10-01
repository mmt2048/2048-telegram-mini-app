import { TableAggregate } from "@convex-dev/aggregate";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { DataModel, Id } from "./_generated/dataModel";
import { components, internal } from "./_generated/api";
import { Migrations } from "@convex-dev/migrations";

export const aggregateUserTotalsByDailyBestScore = new TableAggregate<{
    Key: [string, number];
    DataModel: DataModel;
    TableName: "userTotals";
}>(components.aggregateUserTotalsByDailyBestScore, {
    sortKey: (doc) => [doc.dailyResetDate, -doc.dailyBestScore],
});
export const aggregateUserTotalsByTotalScore = new TableAggregate<{
    Key: number;
    DataModel: DataModel;
    TableName: "userTotals";
}>(components.aggregateUserTotalsByTotalScore, {
    sortKey: (doc) => -doc.totalScore,
});

export const migrations = new Migrations<DataModel>(components.migrations);
export const backfillUserTotalsMigration = migrations.define({
    table: "userTotals",
    migrateOne: async (ctx, doc) => {
        await aggregateUserTotalsByDailyBestScore.insertIfDoesNotExist(
            ctx,
            doc
        );
        await aggregateUserTotalsByTotalScore.insertIfDoesNotExist(ctx, doc);
    },
});
export const runUserTotalsBackfill = migrations.runner(
    internal.userTotals.backfillUserTotalsMigration
);
export const removeNegValuesMigration = migrations.define({
    table: "userTotals",
    migrateOne: () => ({
        negTotalScore: undefined,
        negDailyBestScore: undefined,
    }),
});
export const runRemoveNegValuesMigration = migrations.runner(
    internal.userTotals.removeNegValuesMigration
);

export async function getUserTotalsByUserId(
    ctx: QueryCtx | MutationCtx,
    userId: Id<"users">
) {
    return await ctx.db
        .query("userTotals")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
}

export function getTodayDateKey(): string {
    const now = new Date();
    return getDateKey(now);
}

function getDateKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
        2,
        "0"
    )}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export async function addFinishedScoreToTotals(
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
