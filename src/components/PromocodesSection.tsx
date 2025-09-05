import { Section, Timeline, Text, Skeleton } from "@telegram-apps/telegram-ui";
import { TimelineItem } from "@telegram-apps/telegram-ui/dist/components/Blocks/Timeline/components/TimelineItem/TimelineItem";
import { formatNumberWithSpaces } from "@/helper/formatter";
import { useLaunchParams } from "@telegram-apps/sdk-react";
import { useEffect, useState } from "react";
import PromocodeButton from "@/components/PromocodeButton";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type PromocodesSection = {
    header: string;
    footer: string;
    type: "record" | "total";
};

const TimelineItemsSkeleton = (times: number) => (
    <Timeline>
        {Array.from({ length: times }, (_, index) => (
            <TimelineItem
                key={index}
                header={
                    (
                        <Skeleton visible>Промокод на 100 ₽ от 1000 ₽</Skeleton>
                    ) as any
                }
            >
                <Skeleton visible>1 000 очков</Skeleton>
            </TimelineItem>
        ))}
    </Timeline>
);

export const PromocodesSection = ({
    header,
    footer,
    type,
}: PromocodesSection) => {
    const lp = useLaunchParams(true);
    const recordScore = useQuery(api.games.getRecordScore, {
        telegramUser: lp.tgWebAppData?.user,
    });
    const totalScore = useQuery(api.games.getTotalScore, {
        telegramUser: lp.tgWebAppData?.user,
    });
    const promocodes = useQuery(api.promocodes.getUserPromocodes, {
        telegramUser: lp.tgWebAppData?.user,
    });
    const promocodeTypes = useQuery(api.promocodeTypes.getPromocodeTypes);

    type ConvexPromocodeType = {
        _id: Id<"promocodeTypes">;
        discount: number;
        minOrder: number;
        score: number;
        type: "record" | "total";
    };
    const [processedPromocodeTypes, setProcessedPromocodeTypes] = useState<
        ConvexPromocodeType[] | null
    >(null);

    // Previously used for inline open button, no longer needed; kept for possible future UX tweaks

    useEffect(() => {
        if (promocodeTypes) {
            setProcessedPromocodeTypes(
                promocodeTypes
                    .filter((pt: ConvexPromocodeType) => pt.type === type)
                    .sort(
                        (a: ConvexPromocodeType, b: ConvexPromocodeType) =>
                            a.score - b.score
                    )
            );
        }
    }, [promocodeTypes]);

    const getPromocodeStatus = (promocodeType: ConvexPromocodeType) => {
        const existingPromocode = promocodes?.find(
            (p) => p.promocodeTypeId === promocodeType._id
        );
        if (existingPromocode) {
            return existingPromocode.opened ? "opened" : "ready";
        }
        return "locked";
    };

    const lastActiveIndex = processedPromocodeTypes?.reduce(
        (lastIdx, type, idx) => {
            const status = getPromocodeStatus(type);
            return status === "ready" || status === "opened" ? idx : lastIdx;
        },
        -1
    );

    // kept for potential future usage; state updates now handled by PromocodeButtons

    const getItemMode = (index: number) => {
        if (index === lastActiveIndex) {
            return "pre-active";
        } else if (lastActiveIndex && index < lastActiveIndex) {
            return "active";
        }
        return undefined;
    };

    const showTimeline =
        recordScore !== undefined &&
        totalScore !== undefined &&
        promocodes !== undefined &&
        promocodeTypes !== undefined &&
        processedPromocodeTypes;

    return (
        <Section header={header} footer={footer}>
            {showTimeline && (
                <Timeline>
                    {processedPromocodeTypes!.map((type, index) => {
                        const status = getPromocodeStatus(type);
                        const header = `Промокод на ${type.discount} ₽ от ${type.minOrder} ₽`;
                        const promocodeDoc = promocodes?.find(
                            (p) => p.promocodeTypeId === type._id
                        );
                        const code = promocodeDoc?.code;
                        const itemMode = getItemMode(index);

                        return (
                            <TimelineItem
                                key={type._id as unknown as string}
                                header={header}
                                mode={itemMode}
                            >
                                {status === "locked" && (
                                    <Text>
                                        {formatNumberWithSpaces(type.score)}{" "}
                                        очков
                                    </Text>
                                )}
                                {promocodeDoc && (
                                    <PromocodeButton
                                        promocodeId={promocodeDoc._id}
                                        code={code ?? "—"}
                                        opened={status === "opened"}
                                        size="m"
                                        stretched
                                        onOpened={() => {
                                            /* no-op; local component handles UI state */
                                        }}
                                    />
                                )}
                            </TimelineItem>
                        );
                    })}
                </Timeline>
            )}
            {!showTimeline && TimelineItemsSkeleton(5)}
        </Section>
    );
};
