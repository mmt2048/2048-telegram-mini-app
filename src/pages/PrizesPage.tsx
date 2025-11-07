import React from "react";
import { Page } from "@/components/Page";

import { PromocodesSection } from "@/components/PromocodesSection";
import { StatsSection } from "@/components/StatsSection";
import { Subheadline, List } from "@telegram-apps/telegram-ui";
import { openLink } from "@telegram-apps/sdk-react";

const PromocodeRulesLink: React.FC = () => (
    <a
        style={{
            color: "var(--tgui--link_color)",
            cursor: "pointer",
            textDecoration: "underline",
            fontWeight: "normal",
        }}
        onClick={() => openLink("https://legal.mm.ru/")}
    >
        Правила акции
    </a>
);

const Subheader: React.FC = () => (
    <Subheadline
        level="2"
        style={{
            color: "var(--tgui--hint_color)",
            fontStyle: "italic",
        }}
    >
        Успей применить до 30 ноября 2025 г. при заказе на сайте и в приложении
        Магнит Маркет
    </Subheadline>
);

const PrizesPage: React.FC = () => {
    return (
        <Page back={false}>
            <List>
                <StatsSection />

                <PromocodesSection
                    header={
                        <>
                            Промокоды за рекорд
                            <Subheader />
                        </>
                    }
                    footer={
                        <>
                            Получите призы за лучший результат в одной игре. Чем
                            выше ваш рекорд, тем ценнее награда!{" "}
                            <PromocodeRulesLink />
                        </>
                    }
                    type="record"
                />

                <PromocodesSection
                    header={
                        <>
                            Промокоды за все игры
                            <Subheader />
                        </>
                    }
                    footer={
                        <>
                            Получите призы за суммарное количество очков за все
                            игры. Чем больше очков, тем ценнее награда!{" "}
                            <PromocodeRulesLink />
                        </>
                    }
                    type="total"
                />
            </List>
        </Page>
    );
};

export default PrizesPage;
