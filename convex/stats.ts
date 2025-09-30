import { query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

function startOfTodayMs(): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.getTime();
}

export const getTotalUsers = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        return users.length;
    },
});

export const getNewUsersToday = query({
    args: {},
    handler: async (ctx) => {
        const start = startOfTodayMs();
        const users = await ctx.db
            .query("users")
            .withIndex("by_creation_time")
            .filter((q) => q.gte(q.field("_creationTime"), start))
            .collect();
        return users.length;
    },
});

export const getAvailablePromocodesCount = query({
    args: {},
    handler: async (ctx) => {
        const [types, available] = await Promise.all([
            ctx.db.query("promocodeTypes").collect(),
            ctx.db.query("availablePromocodes").collect(),
        ]);

        const counts = new Map<Id<"promocodeTypes">, number>();
        for (const ap of available) {
            counts.set(
                ap.promocodeTypeId,
                (counts.get(ap.promocodeTypeId) ?? 0) + 1
            );
        }

        return types
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((t) => ({
                label: t.label ?? null,
                type: t.type,
                discount: t.discount,
                minOrder: t.minOrder,
                count: counts.get(t._id) ?? 0,
            }));
    },
});
