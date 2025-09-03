import { Section, Title, Cell, Skeleton } from "@telegram-apps/telegram-ui";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLaunchParams } from "@telegram-apps/sdk-react";

export default function Score() {
    const lp = useLaunchParams(true);

    const game = useQuery(api.games.getInProgressGame, {
        telegramUser: lp.tgWebAppData?.user,
    });
    const score = game?.score;

    return (
        <Section header="Очки">
            <Cell interactiveAnimation="opacity">
                {score !== undefined && <Title weight="2">{score}</Title>}
                {score === undefined && (
                    <Skeleton visible={true}>
                        <Title weight="2">1000</Title>
                    </Skeleton>
                )}
            </Cell>
        </Section>
    );
}
