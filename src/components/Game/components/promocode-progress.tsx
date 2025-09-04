import { useLaunchParams } from "@telegram-apps/sdk-react";
import {
    CircularProgress,
    Section,
    Text,
    Subheadline,
} from "@telegram-apps/telegram-ui";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatNumberWithSpaces } from "@/helper/formatter";

export default function PromocodeProgress() {
    const lp = useLaunchParams(true);
    const game = useQuery(api.games.getInProgressGame, {
        telegramUser: lp.tgWebAppData?.user,
    });
    const totalScore = useQuery(api.games.getTotalScore, {
        telegramUser: lp.tgWebAppData?.user,
    });
    const promocodeTypes = useQuery(api.promocodeTypes.getPromocodeTypes);
    const userPromocodes = useQuery(api.promocodes.getUserPromocodes, {
        telegramUser: lp.tgWebAppData?.user,
    });

    const currentRecord = game?.score ?? 0;
    const currentTotal = totalScore ?? 0;

    const unopenedTypes = (promocodeTypes ?? []).filter(
        (pt) => !userPromocodes?.some((up) => up.promocodeTypeId === pt._id)
    );

    const getNextTargetForType = (type: "record" | "total") => {
        const candidates = unopenedTypes
            .filter((pt) => pt.type === type)
            .map((pt) => pt.score ?? 0)
            .sort((a, b) => a - b);
        return candidates[0];
    };

    const recordTarget = getNextTargetForType("record");
    const totalTarget = getNextTargetForType("total");

    const panels = [
        {
            key: "record",
            title: "В этой игре",
            current: currentRecord,
            target: recordTarget,
            progress:
                typeof recordTarget === "number" && recordTarget > 0
                    ? Math.min(
                          100,
                          Math.max(0, (currentRecord / recordTarget) * 100)
                      )
                    : 100,
        },
        {
            key: "total",
            title: "За все игры",
            current: currentTotal,
            target: totalTarget,
            progress:
                typeof totalTarget === "number" && totalTarget > 0
                    ? Math.min(
                          100,
                          Math.max(0, (currentTotal / totalTarget) * 100)
                      )
                    : 100,
        },
    ];

    return (
        <Section footer="До промокода осталось еще немного!">
            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "auto",
                    margin: "0 1.5em",
                }}
            >
                {panels.map((p) => (
                    <div
                        key={p.key}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            margin: "1em 0",
                            flex: 1,
                        }}
                    >
                        <Text weight="2" style={{ marginBottom: "0.1em" }}>
                            {p.title}
                        </Text>
                        <CircularProgress progress={p.progress} size="large" />
                        <Subheadline
                            style={{ color: "var(--tgui--hint_color)" }}
                        >
                            {formatNumberWithSpaces(p.current)} /{" "}
                            {typeof p.target === "number"
                                ? formatNumberWithSpaces(p.target)
                                : "—"}
                        </Subheadline>
                    </div>
                ))}
            </div>
        </Section>
    );
}
