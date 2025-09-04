import { useLaunchParams } from "@telegram-apps/sdk-react";
import { Cell, Progress, Section } from "@telegram-apps/telegram-ui";
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

    const closest = (() => {
        const unopenedTypes = (promocodeTypes ?? []).filter(
            (pt) => !userPromocodes?.some((up) => up.promocodeTypeId === pt._id)
        );

        const currentRecord = game?.score ?? 0;
        const currentTotal = (totalScore ?? 0) + (game?.score ?? 0);

        return unopenedTypes
            .map((pt) => {
                const current =
                    pt.type === "record" ? currentRecord : currentTotal;
                const left = (pt.score ?? 0) - current;
                return { pt, left } as const;
            })
            .filter((x) => x.left > 0)
            .sort((a, b) => a.left - b.left)[0];
    })();

    const closesPromocode = closest?.pt;
    const left = closest?.left ?? 0;

    const progress = (() => {
        if (!closesPromocode) return 0;
        const target = closesPromocode.score;
        if (!target || target <= 0) return 0;
        const pct = ((target - left) / target) * 100;
        return Math.min(100, Math.max(0, pct));
    })();

    const message = (() => {
        if (!closesPromocode) return "Все промокоды получены 🎉";
        return closesPromocode.type === "record"
            ? `Осталось ${formatNumberWithSpaces(
                  left
              )} очков в этой игре до промокода`
            : `Осталось ${formatNumberWithSpaces(left)} очков до промокода`;
    })();

    return (
        <Section>
            <Cell
                interactiveAnimation="opacity"
                subhead={
                    <Progress
                        value={progress}
                        style={{
                            height: "1em",
                            marginTop: "0.2em",
                            marginBottom: "0.4em",
                        }}
                    />
                }
            >
                {message}
            </Cell>
        </Section>
    );
}
