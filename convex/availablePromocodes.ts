import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { DataModel, Id } from "./_generated/dataModel";
import { TableAggregate } from "@convex-dev/aggregate";
import { components, internal } from "./_generated/api";
import { Migrations } from "@convex-dev/migrations";
import { Triggers } from "convex-helpers/server/triggers";
import {
    customCtx,
    customMutation,
} from "convex-helpers/server/customFunctions";

export const aggregateAvailablePromocodesByType = new TableAggregate<{
    Key: [Id<"promocodeTypes">];
    DataModel: DataModel;
    TableName: "availablePromocodes";
}>(components.aggregateAvailablePromocodesByType, {
    sortKey: (doc) => [doc.promocodeTypeId],
});

const triggers = new Triggers<DataModel>();
triggers.register(
    "availablePromocodes",
    aggregateAvailablePromocodesByType.idempotentTrigger()
);
const mutationWithTriggers = customMutation(
    mutation,
    customCtx(triggers.wrapDB)
);

export const migrations = new Migrations<DataModel>(components.migrations);
export const backfillAvailablePromocodesMigration = migrations.define({
    table: "availablePromocodes",
    migrateOne: async (ctx, doc) => {
        await aggregateAvailablePromocodesByType.insertIfDoesNotExist(ctx, doc);
    },
});
export const runAvailablePromocodesBackfill = migrations.runner(
    internal.availablePromocodes.backfillAvailablePromocodesMigration
);

export const addAvailablePromocodes = mutationWithTriggers({
    args: {
        promocodeTypeId: v.id("promocodeTypes"),
        codes: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        for (const code of args.codes) {
            await ctx.db.insert("availablePromocodes", {
                promocodeTypeId: args.promocodeTypeId,
                code: code,
            });
        }

        return args.codes.length;
    },
});

export const addAvailablePromocodesNTimes = mutationWithTriggers({
    args: {
        promocodeTypeId: v.id("promocodeTypes"),
        code: v.string(),
        n: v.number(),
    },
    handler: async (ctx, args) => {
        for (let i = 0; i < args.n; i++) {
            await ctx.db.insert("availablePromocodes", {
                promocodeTypeId: args.promocodeTypeId,
                code: args.code,
            });
        }

        return args.n;
    },
});
