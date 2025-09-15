import {
    Section,
    Timeline,
    Text,
    Skeleton,
    Badge,
    Button,
} from "@telegram-apps/telegram-ui";
import { TimelineItem } from "@telegram-apps/telegram-ui/dist/components/Blocks/Timeline/components/TimelineItem/TimelineItem";
import { formatNumberWithSpaces } from "@/helper/formatter";
import { openLink } from "@telegram-apps/sdk-react";
import { useLaunchParams } from "@telegram-apps/sdk-react";
import PromocodeButton from "@/components/PromocodeButton";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

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
    type PromocodeType = Doc<"promocodeTypes">;
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
    const promocodeTypes = useQuery(api.promocodeTypes.getPromocodeTypes, {
        type,
    });

    const getPromocodeStatus = (promocodeType: PromocodeType) => {
        const existingPromocode = promocodes?.find(
            (p) => p.promocodeTypeId === promocodeType._id
        );
        if (existingPromocode) {
            return existingPromocode.opened ? "opened" : "ready";
        }
        return "locked";
    };

    const lastActiveIndex = promocodeTypes?.reduce((lastIdx, type, idx) => {
        const status = getPromocodeStatus(type);
        return status === "ready" || status === "opened" ? idx : lastIdx;
    }, -1);

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
        promocodeTypes !== undefined;

    return (
        <Section header={header} footer={footer}>
            {showTimeline && (
                <Timeline>
                    {promocodeTypes!.map((type, index) => {
                        const status = getPromocodeStatus(type);
                        const promocodeDoc = promocodes?.find(
                            (p) => p.promocodeTypeId === type._id
                        );
                        const code = promocodeDoc?.code;
                        const itemMode = getItemMode(index);

                        return (
                            <TimelineItem
                                key={type._id}
                                // @ts-ignore
                                header={
                                    <>
                                        <Text weight="2">
                                            -{type.discount} ₽
                                        </Text>
                                        <Text
                                            weight="2"
                                            style={{
                                                color: "var(--tgui--hint_color)",
                                            }}
                                        >
                                            {" "}
                                            от {type.minOrder} ₽
                                        </Text>
                                        {type.label && (
                                            <Badge
                                                mode="secondary"
                                                type="number"
                                                onClick={() => {
                                                    if (type.url) {
                                                        openLink(type.url);
                                                    }
                                                }}
                                                style={{
                                                    cursor: type.url
                                                        ? "pointer"
                                                        : "default",
                                                }}
                                            >
                                                {type.label}
                                            </Badge>
                                        )}
                                    </>
                                }
                                mode={itemMode}
                            >
                                <div style={{ width: "16em" }}>
                                    {status === "locked" && (
                                        <Button
                                            disabled
                                            size="m"
                                            stretched
                                            mode="bezeled"
                                        >
                                            {formatNumberWithSpaces(type.score)}{" "}
                                            очков
                                        </Button>
                                    )}
                                    {promocodeDoc && (
                                        <PromocodeButton
                                            promocodeId={promocodeDoc._id}
                                            code={code ?? "—"}
                                            opened={status === "opened"}
                                            size="m"
                                            stretched
                                        />
                                    )}
                                </div>
                            </TimelineItem>
                        );
                    })}
                </Timeline>
            )}
            {!showTimeline && TimelineItemsSkeleton(5)}
        </Section>
    );
};
