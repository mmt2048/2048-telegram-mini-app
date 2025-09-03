import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserByTelegramUser } from "./users";

export const getUserPromocodes = query({
    args: {
        telegramUser: v.any(),
    },
    handler: async (ctx, args) => {
        const user = await getUserByTelegramUser(ctx, args.telegramUser);
        if (!user) return [];
        return await ctx.db
            .query("promocodes")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();
    },
});

export const createPromocode = mutation({
    args: {
        telegramUser: v.any(),
        promocodeTypeId: v.id("promocodeTypes"),
    },
    handler: async (ctx, args) => {
        const user = await getUserByTelegramUser(ctx, args.telegramUser);
        if (!user) return null;
        const code = Math.random().toString(36).substring(2, 14).toUpperCase();
        return await ctx.db.insert("promocodes", {
            userId: user._id,
            promocodeTypeId: args.promocodeTypeId,
            code: code,
        });
    },
});
