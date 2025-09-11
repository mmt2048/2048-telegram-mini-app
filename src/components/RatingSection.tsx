import { ratingLength } from "@/constants";
import { formatNumberWithSpaces } from "@/helper/formatter";
import { useLaunchParams } from "@telegram-apps/sdk-react";
import { Cell, Divider, Section, Skeleton } from "@telegram-apps/telegram-ui";
import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export const RatingSection: React.FC<{
    title: string;
    footer: string;
    noDataText: string;
    type: "daily" | "total";
    scope: "global" | "friends";
}> = ({ title, footer, noDataText, type, scope }) => {
    const lp = useLaunchParams(true);
    const rating = useQuery(api.rating.getRating, {
        telegramUser: lp.tgWebAppData?.user,
        type: type,
        scope: scope,
        limit: ratingLength,
    });

    const currentUserId = lp.tgWebAppData?.user?.id;

    return (
        <Section header={title} footer={footer}>
            <Skeleton visible={rating === undefined}>
                {rating && rating.length === 0 && <Cell>{noDataText}</Cell>}
                {rating &&
                    rating
                        ?.sort((a, b) => a.place - b.place)
                        .map((rating) => {
                            const isCurrentUser =
                                rating.user_id === currentUserId;
                            const isExtraPosition = rating.place > ratingLength;

                            const medalEmoji =
                                rating.place === 1
                                    ? "🥇"
                                    : rating.place === 2
                                      ? "🥈"
                                      : rating.place === 3
                                        ? "🥉"
                                        : rating.place;

                            return (
                                <React.Fragment key={rating.user_id}>
                                    {isExtraPosition && <Divider />}
                                    <Cell
                                        before={
                                            <span
                                                style={{
                                                    minWidth: "3em",
                                                    textAlign: "center",
                                                }}
                                            >
                                                {medalEmoji}
                                            </span>
                                        }
                                        subtitle={`${formatNumberWithSpaces(rating.score)} очков`}
                                        interactiveAnimation="opacity"
                                        style={{ cursor: "default" }}
                                    >
                                        <span
                                            style={{
                                                fontWeight: isCurrentUser
                                                    ? 600
                                                    : 400,
                                            }}
                                        >
                                            {rating.user_nickname ?? "Аноним"}
                                        </span>
                                        {isCurrentUser && (
                                            <span
                                                style={{
                                                    color: "var(--tg-theme-subtitle-text-color)",
                                                }}
                                            >
                                                {" (Вы)"}
                                            </span>
                                        )}
                                    </Cell>
                                </React.Fragment>
                            );
                        })}
            </Skeleton>
        </Section>
    );
};
