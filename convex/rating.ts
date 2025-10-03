import { v } from "convex/values";
import { query } from "./_generated/server";
import {
    getTodayDateKey,
    aggregateUserTotalsByDailyBestScore,
    aggregateUserTotalsByTotalScore,
} from "./userTotals";
import { getUserTotalsByUserId } from "./userTotals";

export const getRating = query({
    args: {
        userId: v.id("users"),
        type: v.union(v.literal("daily"), v.literal("total")),
        limit: v.number(),
    },
    handler: async (ctx, args) => {
        const isDaily = args.type === "daily";
        const scoreField: "dailyBestScore" | "totalScore" = isDaily
            ? "dailyBestScore"
            : "totalScore";

        let page;
        const todayDateKey = getTodayDateKey();
        if (isDaily) {
            page = await aggregateUserTotalsByDailyBestScore.paginate(ctx, {
                bounds: {
                    prefix: [todayDateKey],
                },
                pageSize: args.limit,
            });
        } else {
            page = await aggregateUserTotalsByTotalScore.paginate(ctx, {
                pageSize: args.limit,
            });
        }

        const userTotals = await Promise.all(
            page.page.map((doc) => ctx.db.get(doc.id))
        );

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
            // await aggregateUserTotalsByDailyBestScore.ge
            const requestingUserTotals = await getUserTotalsByUserId(
                ctx,
                args.userId
            );
            const requestingUser = await ctx.db.get(args.userId);
            if (requestingUser && requestingUserTotals) {
                let userPlace;
                if (
                    isDaily &&
                    requestingUserTotals.dailyResetDate === todayDateKey
                ) {
                    userPlace =
                        await aggregateUserTotalsByDailyBestScore.indexOfDoc(
                            ctx,
                            requestingUserTotals,
                            {
                                bounds: {
                                    prefix: [todayDateKey],
                                },
                            }
                        );
                    rating.push({
                        user_id: requestingUser.telegramId,
                        user_nickname: requestingUser.nickname,
                        score: requestingUserTotals[scoreField],
                        place: userPlace + 1,
                    });
                } else if (!isDaily) {
                    userPlace =
                        await aggregateUserTotalsByTotalScore.indexOfDoc(
                            ctx,
                            requestingUserTotals
                        );

                    rating.push({
                        user_id: requestingUser.telegramId,
                        user_nickname: requestingUser.nickname,
                        score: requestingUserTotals[scoreField],
                        place: userPlace + 1,
                    });
                }
            }
        }

        return rating;
    },
});
