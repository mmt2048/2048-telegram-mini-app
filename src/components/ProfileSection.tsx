import { Cell, Section, Skeleton } from "@telegram-apps/telegram-ui";
import EditIcon from "@mui/icons-material/Edit";
import { hapticFeedback } from "@telegram-apps/sdk-react";
import { NicknameModal } from "./NicknameModal";
import { useState } from "react";
import { InviteUrlCell } from "./InviteUrlCell";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useUser } from "@/contexts/UserContext";

export const ProfileSection = () => {
    const { userId } = useUser();
    const me = useQuery(api.users.getUser, userId ? { userId } : "skip");

    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <Section header="Профиль">
            <Cell
                subtitle="Имя"
                after={
                    <EditIcon
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                            hapticFeedback.impactOccurred.ifAvailable("light");
                            setIsModalOpen(true);
                        }}
                    />
                }
                interactiveAnimation="opacity"
                style={{ cursor: "default" }}
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
