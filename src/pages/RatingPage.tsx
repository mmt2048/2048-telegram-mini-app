import { Page } from "@/components/Page";
import { ButtonCell, List, Section } from "@telegram-apps/telegram-ui";
import GroupIcon from "@mui/icons-material/Group";
import { RatingSection } from "@/components/RatingSection";
import { ProfileSection } from "@/components/ProfileSection";
import { useNavigate } from "react-router-dom";
import { hapticFeedback } from "@telegram-apps/sdk-react";

const RatingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Page back={false}>
            <List>
                <ProfileSection />

                <RatingSection
                    title="Лучшие игроки дня"
                    footer="Рейтинг игроков с самыми высокими рекордами за последние 24 часа. Попадите в топ и станьте лучшим!"
                    noDataText="Сегодня ещё никто не играл, будь первым!"
                    type="daily"
                />

                <RatingSection
                    title="Общий зачёт"
                    footer="Суммарный рейтинг всех игроков за все время. Чем больше играете и набираете очков, тем выше поднимаетесь!"
                    noDataText="Никто ещё не играл, будь первым!"
                    type="total"
                />

                <Section>
                    <ButtonCell
                        before={<GroupIcon />}
                        onClick={() => {
                            hapticFeedback.impactOccurred.ifAvailable("medium");
                            navigate("/friends");
                        }}
                    >
                        Список друзей
                    </ButtonCell>
                </Section>
            </List>
        </Page>
    );
};

export default RatingPage;
