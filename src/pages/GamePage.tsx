import React, { useContext } from "react";
import Score from "@/components/Game/components/score";
import Board from "@/components/Game/components/board";
import "@/components/Game/styles/globals.css";
import { List } from "@telegram-apps/telegram-ui";
import { Page } from "@/components/Page";
import { GameContext } from "@/components/Game/context/game-context";
import PromocodeProgress from "@/components/Game/components/promocode-progress";
import MobileSwiper, {
    SwipeInput,
} from "@/components/Game/components/mobile-swiper";
import PromocodeAwardModal from "@/components/PromocodeAwardModal";

const GamePage: React.FC = () => {
    const { moveTiles, status } = useContext(GameContext);

    const handleSwipe = ({ deltaX, deltaY }: SwipeInput) => {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0) {
                moveTiles("move_right");
            } else {
                moveTiles("move_left");
            }
        } else {
            if (deltaY > 0) {
                moveTiles("move_down");
            } else {
                moveTiles("move_up");
            }
        }
    };

    return (
        <Page back={false} swipeable={false} flexChildren={true}>
            <MobileSwiper onSwipe={handleSwipe} disabled={status === "lost"}>
                <List>
                    <PromocodeAwardModal />
                    <Score />

                    <div
                        style={{
                            marginTop: "1em",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <Board />
                    </div>

                    <PromocodeProgress />
                </List>
            </MobileSwiper>
        </Page>
    );
};

export default GamePage;
