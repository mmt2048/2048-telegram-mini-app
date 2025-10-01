import { GameContext } from "@/components/Game/context/game-context";
import styles from "@/components/Game/styles/splash.module.css";
import { Button, LargeTitle, List } from "@telegram-apps/telegram-ui";
import { useContext, useState } from "react";
import { hapticFeedback } from "@telegram-apps/sdk-react";

export default function Splash({ heading = "You lost!" }) {
    const { restartGame } = useContext(GameContext);
    const [isLoading, setIsLoading] = useState(false);

    const handleStartGame = () => {
        hapticFeedback.impactOccurred.ifAvailable("medium");
        setIsLoading(true);
        void restartGame();
    };

    return (
        <div className={`${styles.splash}`}>
            <List>
                <LargeTitle weight="1">{heading}</LargeTitle>
                <Button loading={isLoading} onClick={handleStartGame}>
                    Продолжить
                </Button>
            </List>
        </div>
    );
}
