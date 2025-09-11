import { v } from "convex/values";
import { query } from "./_generated/server";

export const getPromocodeTypes = query({
    args: {
        type: v.optional(v.union(v.literal("record"), v.literal("total"))),
    },
    handler: async (ctx, args) => {
        let types;
        if (args.type !== undefined) {
            types = await ctx.db
                .query("promocodeTypes")
                .withIndex("by_type", (q) =>
                    q.eq("type", args.type as "record" | "total")
                )
                .collect();
        } else {
            types = await ctx.db.query("promocodeTypes").collect();
        }

        return types.sort(
            (a, b) => (a.sort_order ?? 1000000) - (b.sort_order ?? 1000000)
        );
    },
});
