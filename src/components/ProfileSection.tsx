import { Cell, Section, Skeleton } from "@telegram-apps/telegram-ui";
import EditIcon from "@mui/icons-material/Edit";
import { hapticFeedback, useLaunchParams } from "@telegram-apps/sdk-react";
import { NicknameModal } from "./NicknameModal";
import { useState } from "react";
import { InviteUrlCell } from "./InviteUrlCell";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export const ProfileSection = () => {
    const lp = useLaunchParams(true);
    const me = useQuery(api.users.getUser, {
        telegramUser: lp.tgWebAppData?.user,
    });

    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <Section header="Профиль">
            <Cell
                subtitle="Имя"
                after={
                    <EditIcon
                        onClick={() => {
                            hapticFeedback.impactOccurred.ifAvailable("light");
                            setIsModalOpen(true);
                        }}
                    />
                }
                interactiveAnimation="opacity"
            >
                {me !== undefined && me?.nickname}
                {me === undefined && (
                    <Skeleton visible={true}>LongestNicknameEver</Skeleton>
                )}
            </Cell>

            <InviteUrlCell />

            {isModalOpen && (
                <NicknameModal
                    isOpen={isModalOpen}
                    setIsOpen={setIsModalOpen}
                />
            )}
        </Section>
    );
};
