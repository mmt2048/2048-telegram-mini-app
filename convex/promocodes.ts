import { v } from "convex/values";
import { MutationCtx, mutation, query } from "./_generated/server";
import { DataModel, Id } from "./_generated/dataModel";
import { TableAggregate } from "@convex-dev/aggregate";
import { components, internal } from "./_generated/api";
import { Migrations } from "@convex-dev/migrations";

export const aggregateAvailablePromocodesByType = new TableAggregate<{
    Key: [Id<"promocodeTypes">];
    DataModel: DataModel;
    TableName: "availablePromocodes";
}>(components.aggregateAvailablePromocodesByType, {
    sortKey: (doc) => [doc.promocodeTypeId],
});

export const migrations = new Migrations<DataModel>(components.migrations);
export const backfillAvailablePromocodesMigration = migrations.define({
    table: "availablePromocodes",
    migrateOne: async (ctx, doc) => {
        await aggregateAvailablePromocodesByType.insertIfDoesNotExist(ctx, doc);
    },
});
export const runAvailablePromocodesBackfill = migrations.runner(
    internal.promocodes.backfillAvailablePromocodesMigration
);

export const getUserPromocodes = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("promocodes")
            .withIndex("by_user_and_type", (q) => q.eq("userId", args.userId))
            .collect();
    },
});

export const createPromocode = mutation({
    args: {
        userId: v.id("users"),
        promocodeTypeId: v.id("promocodeTypes"),
    },
    handler: async (ctx, args) => {
        const code = Math.random().toString(36).substring(2, 14).toUpperCase();
        return await ctx.db.insert("promocodes", {
            userId: args.userId,
            promocodeTypeId: args.promocodeTypeId,
            code: code,
            opened: false,
        });
    },
});

export const markOpened = mutation({
    args: {
        userId: v.id("users"),
        promocodeId: v.id("promocodes"),
    },
    handler: async (ctx, args) => {
        const pc = await ctx.db.get(args.promocodeId);
        if (!pc || pc.userId !== args.userId) return null;

        if (pc.opened) return pc._id; // idempotent
        await ctx.db.patch(pc._id, { opened: true });
        return pc._id;
    },
});

export const getLastPromocodeId = query({
    args: {},
    handler: async (ctx) => {
        const pc = await ctx.db
            .query("promocodes")
            .withIndex("by_creation_time")
            .order("desc")
            .first();
        return pc ? pc._id : null;
    },
});

export const getPromocodeWithUserAndType = query({
    args: {
        promocodeId: v.id("promocodes"),
    },
    handler: async (ctx, args) => {
        const pc = await ctx.db.get(args.promocodeId);
        if (!pc) return null;
        const user = await ctx.db.get(pc.userId);
        const promocodeType = await ctx.db.get(pc.promocodeTypeId);
        return { promocode: pc, user, promocodeType };
    },
});
``;

export async function awardEligiblePromocodes(
    ctx: MutationCtx,
    userId: Id<"users">,
    options: { recordScore?: number; totalScore?: number }
) {
    const { recordScore, totalScore } = options;

    // Early exit if no scores provided
    if (recordScore === undefined && totalScore === undefined) {
        return;
    }

    const types = await ctx.db.query("promocodeTypes").collect();

    // Filter types that could be eligible based on scores (pre-filter before database queries)
    const eligibleTypes = types.filter((t) => {
        if (t.type === "record" && typeof recordScore === "number") {
            return recordScore >= (t.score ?? 0);
        }
        if (t.type === "total" && typeof totalScore === "number") {
            return totalScore >= (t.score ?? 0);
        }
        return false;
    });

    // Early exit if no eligible types
    if (eligibleTypes.length === 0) {
        return;
    }

    // Batch check existing promocodes for all eligible types (reduces N queries to 1)
    const existingPromocodes = await ctx.db
        .query("promocodes")
        .withIndex("by_user_and_type", (q) => q.eq("userId", userId))
        .collect();

    const existingTypeIds = new Set(
        existingPromocodes.map((pc) => pc.promocodeTypeId)
    );

    // Helper to ensure a promocode exists for a type by consuming from available pool
    const ensurePromocodeForType = async (
        promocodeTypeId: Id<"promocodeTypes">
    ) => {
        if (existingTypeIds.has(promocodeTypeId)) {
            return null; // Already have this type, skip
        }

        // Pull one available promocode for this type
        const available = await ctx.db
            .query("availablePromocodes")
            .withIndex("by_type", (q) =>
                q.eq("promocodeTypeId", promocodeTypeId)
            )
            .first();

        if (!available) return null;

        const newId = await ctx.db.insert("promocodes", {
            userId,
            promocodeTypeId,
            code: available.code,
            opened: false,
        });

        await ctx.db.delete(available._id);
        return newId;
    };

    for (const t of eligibleTypes) {
        await ensurePromocodeForType(t._id);
    }
}
