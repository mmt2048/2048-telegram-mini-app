import { v } from "convex/values";
import { MutationCtx, mutation, query } from "./_generated/server";
import { getUserByTelegramUser } from "./users";
import { Id } from "./_generated/dataModel";

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
            opened: false,
        });
    },
});

export const markOpened = mutation({
    args: {
        telegramUser: v.any(),
        promocodeId: v.id("promocodes"),
    },
    handler: async (ctx, args) => {
        const user = await getUserByTelegramUser(ctx, args.telegramUser);
        if (!user) return null;

        const pc = await ctx.db.get(args.promocodeId);
        if (!pc || pc.userId !== user._id) return null;

        if (pc.opened) return pc._id; // idempotent
        await ctx.db.patch(pc._id, { opened: true });
        return pc._id;
    },
});

function generateCode(): string {
    return Math.random().toString(36).substring(2, 14).toUpperCase();
}

export async function awardEligiblePromocodes(
    ctx: MutationCtx,
    userId: Id<"users">,
    options: { recordScore?: number; totalScore?: number }
) {
    const { recordScore, totalScore } = options;

    const types = await ctx.db.query("promocodeTypes").collect();

    // Helper to ensure a promocode exists for a type
    const ensurePromocodeForType = async (promocodeTypeId: Id<"promocodeTypes">) => {
        const existing = await ctx.db
            .query("promocodes")
            .withIndex("by_user_and_type", (q) =>
                q.eq("userId", userId).eq("promocodeTypeId", promocodeTypeId)
            )
            .first();
        if (existing) return existing._id;
        return await ctx.db.insert("promocodes", {
            userId,
            promocodeTypeId,
            code: generateCode(),
            opened: false,
        });
    };

    for (const t of types) {
        if (t.type === "record" && typeof recordScore === "number") {
            if (recordScore >= (t.score ?? 0)) {
                await ensurePromocodeForType(t._id);
            }
        }
        if (t.type === "total" && typeof totalScore === "number") {
            if (totalScore >= (t.score ?? 0)) {
                await ensurePromocodeForType(t._id);
            }
        }
    }
}
