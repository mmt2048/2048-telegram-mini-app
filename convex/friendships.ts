import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getOrCreateUserByTelegramUser, getUserByTelegramUser } from "./users";

export const addFriend = mutation({
    args: {
        telegramUser: v.any(),
        friendId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await getOrCreateUserByTelegramUser(
            ctx,
            args.telegramUser
        );
        if (!user) throw new Error("User not found");

        await ctx.db.insert("friendships", {
            user1Id: user._id,
            user2Id: args.friendId,
        });
    },
});

export const getFriends = query({
    args: {
        telegramUser: v.any(),
    },
    handler: async (ctx, args) => {
        const user = await getUserByTelegramUser(ctx, args.telegramUser);
        if (!user) throw new Error("User not found");

        const asUser1 = await ctx.db
            .query("friendships")
            .withIndex("by_user1", (q) => q.eq("user1Id", user._id))
            .collect();
        const asUser2 = await ctx.db
            .query("friendships")
            .withIndex("by_user2", (q) => q.eq("user2Id", user._id))
            .collect();

        const friendIds = Array.from(
            new Set([
                ...asUser1.map((doc) => doc.user2Id),
                ...asUser2.map((doc) => doc.user1Id),
            ])
        );

        const friends = await Promise.all(
            friendIds.map((id) => ctx.db.get(id))
        );
        return friends.filter((f) => f !== null);
    },
});

export const removeFriend = mutation({
    args: {
        telegramUser: v.any(),
        friendId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await getOrCreateUserByTelegramUser(
            ctx,
            args.telegramUser
        );
        if (!user) throw new Error("User not found");

        const direct = await ctx.db
            .query("friendships")
            .withIndex("by_user1_and_user2", (q) =>
                q.eq("user1Id", user._id).eq("user2Id", args.friendId)
            )
            .collect();

        const inverse = await ctx.db
            .query("friendships")
            .withIndex("by_user1_and_user2", (q) =>
                q.eq("user1Id", args.friendId).eq("user2Id", user._id)
            )
            .collect();

        for (const doc of [...direct, ...inverse]) {
            await ctx.db.delete(doc._id);
        }
    },
});
