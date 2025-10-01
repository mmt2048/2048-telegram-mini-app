import { Stack } from "@mui/material";
import { Cell, Section, Skeleton } from "@telegram-apps/telegram-ui";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ArchiveIcon from "@mui/icons-material/Archive";
import { formatNumberWithSpaces } from "@/helper/formatter";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@/contexts/UserContext";

interface StatItem {
    subtitle: string;
    value: number;
    icon: React.ReactNode;
}

export const StatsSection = () => {
    const { userId } = useUser();
    const recordScore = useQuery(
        api.games.getRecordScore,
        userId ? { userId } : "skip"
    );
    const totalScore = useQuery(
        api.games.getTotalScore,
        userId ? { userId } : "skip"
    );

    const showStats = recordScore !== undefined && totalScore !== undefined;

    const statsData: StatItem[] = [
        {
            subtitle: "Рекорд",
            value: recordScore ?? -1,
            icon: <EmojiEventsIcon />,
        },
        {
            subtitle: "За все игры",
            value: totalScore ?? -1,
            icon: <ArchiveIcon />,
        },
    ];

    return (
        <Section header="Статистика">
            <Stack direction="row" spacing={3}>
                {statsData.map((stat, index) => (
                    <Cell
                        key={index}
                        subtitle={stat.subtitle}
                        type="text"
                        interactiveAnimation="opacity"
                        before={stat.icon}
                        style={{ cursor: "default" }}
                    >
                        {showStats && formatNumberWithSpaces(stat.value)}
                        {!showStats && (
                            <Skeleton visible={true}>10 000</Skeleton>
                        )}
                    </Cell>
                ))}
            </Stack>
        </Section>
    );
};
