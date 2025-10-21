import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { aggregateAvailablePromocodesByType } from "./promocodes";

function startOfTodayMs(): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.getTime();
}

function startOfYesterdayMs(): number {
    return startOfTodayMs() - 24 * 60 * 60 * 1000;
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
        const types = await ctx.db.query("promocodeTypes").collect();

        const counts = await aggregateAvailablePromocodesByType.countBatch(
            ctx,
            types.map((type) => ({
                bounds: {
                    prefix: [type._id],
                },
            }))
        );

        const typeCounts = types.map((type, index) => ({
            label: type.label ?? null,
            type: type.type,
            discount: type.discount,
            minOrder: type.minOrder,
            count: counts[index],
        }));

        return typeCounts;
    },
});

export const getMAU = query({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        const games = await ctx.db
            .query("games")
            .withIndex("by_creation_time", (q) =>
                q.gte("_creationTime", thirtyDaysAgo)
            )
            .collect();
        const uniqueUsers = new Set(games.map((g) => g.userId));
        return uniqueUsers.size;
    },
});

export const getDAUYesterday = query({
    args: {},
    handler: async (ctx) => {
        const startYesterday = startOfYesterdayMs();
        const startToday = startOfTodayMs();
        const games = await ctx.db
            .query("games")
            .withIndex("by_creation_time", (q) =>
                q
                    .gte("_creationTime", startYesterday)
                    .lt("_creationTime", startToday)
            )
            .collect();
        const uniqueUsers = new Set(games.map((g) => g.userId));
        return uniqueUsers.size;
    },
});

export const getNewUsersYesterday = query({
    args: {},
    handler: async (ctx) => {
        const startYesterday = startOfYesterdayMs();
        const startToday = startOfTodayMs();
        const users = await ctx.db
            .query("users")
            .withIndex("by_creation_time", (q) =>
                q
                    .gte("_creationTime", startYesterday)
                    .lt("_creationTime", startToday)
            )
            .collect();
        return users.length;
    },
});

export const getGamesYesterday = query({
    args: {},
    handler: async (ctx) => {
        const startYesterday = startOfYesterdayMs();
        const startToday = startOfTodayMs();
        const games = await ctx.db
            .query("games")
            .withIndex("by_creation_time", (q) =>
                q
                    .gte("_creationTime", startYesterday)
                    .lt("_creationTime", startToday)
            )
            .collect();
        return games.length;
    },
});

export const getUsers = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        return users.length;
    },
});
