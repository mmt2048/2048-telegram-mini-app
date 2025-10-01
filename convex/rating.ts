import { v } from "convex/values";
import { query } from "./_generated/server";
import { getTodayDateKey, aggregateUserTotalsByDailyBestScore, aggregateUserTotalsByTotalScore } from "./userTotals";
import { getUserTotalsByUserId } from "./userTotals";


export const getRating = query({
    args: {
        userId: v.id("users"),
        type: v.union(v.literal("daily"), v.literal("total")),
        limit: v.number(),
    },
    handler: async (ctx, args) => {
        const isDaily = args.type === "daily";
        const scoreField: "dailyBestScore" | "totalScore" = isDaily ? "dailyBestScore" : "totalScore";
        
        let page;
        if (isDaily) {
            page = await aggregateUserTotalsByDailyBestScore.paginate(ctx, {
                bounds: {
                    prefix: [getTodayDateKey()]
                },
                pageSize: args.limit,
            });
        } else {
            page = await aggregateUserTotalsByTotalScore.paginate(ctx, {
                pageSize: args.limit,
            });
        }
        
        const userTotals = await Promise.all(page.page.map((doc) => ctx.db.get(doc.id)));

        let hasRequestingUser = false;

        const rating = [];

        for (const [index, row] of userTotals.entries()) {
            if (row === null) continue;

            if (row.userId === args.userId) {
                hasRequestingUser = true;
            }

            const user = await ctx.db.get(row.userId);
            if (!user) continue;

            rating.push({
                user_id: user.telegramId,
                user_nickname: user.nickname,
                score: row[scoreField],
                place: index + 1,
            });
        }
            
        if (!hasRequestingUser) {
            const requestingUserTotals = await getUserTotalsByUserId(ctx, args.userId);
            const requestingUser = await ctx.db.get(args.userId);
            if (requestingUser && requestingUserTotals) {
                const userPlace = isDaily 
                    ? await aggregateUserTotalsByDailyBestScore.indexOfDoc(ctx, requestingUserTotals) + 1
                    : await aggregateUserTotalsByTotalScore.indexOfDoc(ctx, requestingUserTotals) + 1;
                
                rating.push({
                    user_id: requestingUser.telegramId,
                    user_nickname: requestingUser.nickname,
                    score: requestingUserTotals[scoreField],
                    place: userPlace,
                });
            }
        }

        return rating;
    },
});
