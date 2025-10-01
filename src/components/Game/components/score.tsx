import { Section, Title, Cell, Skeleton } from "@telegram-apps/telegram-ui";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@/contexts/UserContext";

export default function Score() {
    const { userId } = useUser();

    const game = useQuery(
        api.games.getInProgressGame,
        userId ? { userId } : "skip"
    );
    const score = game?.score;

    return (
        <Section header="Очки">
            <Cell interactiveAnimation="opacity" style={{ cursor: "default" }}>
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
