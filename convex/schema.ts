import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    games: defineTable({
        userId: v.optional(v.id("users")),
        score: v.number(),
        status: v.union(v.literal("in_progress"), v.literal("finished")),
        updatedAt: v.optional(v.number()),
    })
        .index("by_user_and_status", ["userId", "status"])
        .index("by_user", ["userId"]),
    users: defineTable({
        telegramId: v.number(),
        username: v.string(),
        firstName: v.string(),
        lastName: v.string(),
        nickname: v.string(),
    }).index("by_telegram_id", ["telegramId"]),
    promocodeTypes: defineTable({
        discount: v.number(),
        minOrder: v.number(),
        score: v.number(),
        type: v.union(v.literal("record"), v.literal("total")),
    }),
    promocodes: defineTable({
        promocodeTypeId: v.id("promocodeTypes"),
        userId: v.id("users"),
        code: v.string(),
        opened: v.boolean(),
    })
        .index("by_user", ["userId"])
        .index("by_user_and_type", ["userId", "promocodeTypeId"]),
    friendships: defineTable({
        user1Id: v.id("users"),
        user2Id: v.id("users"),
    })
        .index("by_user1", ["user1Id"])
        .index("by_user2", ["user2Id"])
        .index("by_user1_and_user2", ["user1Id", "user2Id"]),
});
