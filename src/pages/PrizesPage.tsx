import React from "react";
import { Page } from "@/components/Page";

import { PromocodesSection } from "@/components/PromocodesSection";
import { StatsSection } from "@/components/StatsSection";
import { List } from "@telegram-apps/telegram-ui";

const PrizesPage: React.FC = () => {
    return (
        <Page back={false}>
            <List>
                <StatsSection />

                <PromocodesSection
                    header="Промокоды за рекорд"
                    footer="Получите призы за лучший результат в одной игре. Чем выше ваш рекорд, тем ценнее награда!"
                    type="record"
                />

                <PromocodesSection
                    header="Промокоды за все игры"
                    footer="Получите призы за суммарное количество очков за все игры. Чем больше очков, тем ценнее награда!"
                    type="total"
                />
            </List>
        </Page>
    );
};

export default PrizesPage;
