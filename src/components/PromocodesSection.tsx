import {
    Button,
    Section,
    Timeline,
    Text,
    Skeleton,
} from "@telegram-apps/telegram-ui";
import { TimelineItem } from "@telegram-apps/telegram-ui/dist/components/Blocks/Timeline/components/TimelineItem/TimelineItem";
import { formatNumberWithSpaces } from "@/helper/formatter";
import { hapticFeedback, useLaunchParams } from "@telegram-apps/sdk-react";
import { useEffect, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { useMutation, useQuery } from "convex/react";
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
    const createPromocodeMutation = useMutation(api.promocodes.createPromocode);

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

    const [loadingPromocodeId, setLoadingPromocodeId] = useState<number | null>(
        null
    );

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
            return "opened";
        }

        const requiredScore = promocodeType.score;
        const userScore =
            promocodeType.type === "record" ? recordScore : totalScore;

        if (userScore && userScore >= requiredScore) {
            return "ready";
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

    const getPromocode = async (promocodeTypeId: Id<"promocodeTypes">) => {
        setLoadingPromocodeId(promocodeTypeId as unknown as any);
        try {
            await createPromocodeMutation({
                telegramUser: lp.tgWebAppData?.user,
                promocodeTypeId,
            });
            hapticFeedback.notificationOccurred.ifAvailable("success");
        } finally {
            setLoadingPromocodeId(null);
        }
    };

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
                        const code = promocodes?.find(
                            (p) => p.promocodeTypeId === type._id
                        )?.code;
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
                                {status === "ready" && (
                                    <Button
                                        mode="filled"
                                        stretched
                                        loading={
                                            (loadingPromocodeId as unknown as string) ===
                                            (type._id as unknown as string)
                                        }
                                        onClick={() => getPromocode(type._id)}
                                    >
                                        Получить
                                    </Button>
                                )}
                                {status === "opened" && (
                                    <CopyButton>{code ?? "—"}</CopyButton>
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
