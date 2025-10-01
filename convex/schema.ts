import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    games: defineTable({
        userId: v.id("users"),
        score: v.number(),
        status: v.union(v.literal("in_progress"), v.literal("finished")),
        updatedAt: v.number(),
    })
        .index("by_user_and_status", ["userId", "status"])
        .index("by_user", ["userId"])
        .index("by_updated_at", ["updatedAt"])
        .index("by_user_and_updated_at", ["userId", "updatedAt"]),
    users: defineTable({
        telegramId: v.number(),
        username: v.string(),
        firstName: v.string(),
        lastName: v.string(),
        nickname: v.string(),
    }).index("by_telegram_id", ["telegramId"]),
    userTotals: defineTable({
        userId: v.id("users"),
        totalScore: v.number(),
        recordScore: v.number(),
        negTotalScore: v.optional(v.number()),
        dailyBestScore: v.number(),
        negDailyBestScore: v.optional(v.number()),
        dailyResetDate: v.string(), // YYYY-MM-DD format for daily reset tracking
        updatedAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_negTotalScore", ["negTotalScore"])
        .index("by_negDailyBestScore", ["negDailyBestScore"]),
    promocodeTypes: defineTable({
        sort_order: v.number(),
        label: v.optional(v.string()),
        discount: v.number(),
        minOrder: v.number(),
        score: v.number(),
        type: v.union(v.literal("record"), v.literal("total")),
        url: v.optional(v.string()),
    }).index("by_type", ["type"]),
    promocodes: defineTable({
        promocodeTypeId: v.id("promocodeTypes"),
        userId: v.id("users"),
        code: v.string(),
        opened: v.boolean(),
    })
        .index("by_user", ["userId"])
        .index("by_user_and_type", ["userId", "promocodeTypeId"]),
    availablePromocodes: defineTable({
        promocodeTypeId: v.id("promocodeTypes"),
        code: v.string(),
    }).index("by_type", ["promocodeTypeId"]),
    friendships: defineTable({
        user1Id: v.id("users"),
        user2Id: v.id("users"),
    })
        .index("by_user1", ["user1Id"])
        .index("by_user2", ["user2Id"])
        .index("by_user1_and_user2", ["user1Id", "user2Id"]),
});
