import { Section, Title, Cell } from "@telegram-apps/telegram-ui";
import { useContext } from "react";
import { GameContext } from "@/components/Game/context/game-context";

export default function Score() {
    const { score } = useContext(GameContext);

    return (
        <Section header="Очки">
            <Cell interactiveAnimation="opacity" style={{ cursor: "default" }}>
                <Title weight="2">{score}</Title>
            </Cell>
        </Section>
    );
}
