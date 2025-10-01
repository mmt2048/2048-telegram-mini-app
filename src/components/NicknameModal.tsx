import { Stack } from "@mui/material";
import { Button, Input, Modal, Tappable } from "@telegram-apps/telegram-ui";
import { ModalHeader } from "@telegram-apps/telegram-ui/dist/components/Overlays/Modal/components/ModalHeader/ModalHeader";
import CloseIcon from "@mui/icons-material/Close";
import { hapticFeedback } from "@telegram-apps/sdk-react";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@/contexts/UserContext";

export const NicknameModal: React.FC<{
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}> = ({ isOpen, setIsOpen }) => {
    const { userId } = useUser();
    const me = useQuery(api.users.getUser, userId ? { userId } : "skip");
    const setUserNickname = useMutation(api.users.setUserNickname);

    const [inputNickname, setInputNickname] = useState("");

    useEffect(() => {
        if (me) {
            setInputNickname(me.nickname);
        }
    }, [me]);

    const validateNickname = (nickname: string) => {
        if (!nickname) return false;
        if (nickname.length < 2 || nickname.length > 30) {
            return false;
        }
        const regex = /^[a-zA-Z0-9а-яА-ЯёЁ._\- ]+$/;
        return regex.test(nickname);
    };

    const changeNickname = async (nickname: string) => {
        if (!userId) return;
        try {
            await setUserNickname({
                userId,
                nickname: nickname,
            });
            hapticFeedback.notificationOccurred.ifAvailable("success");
        } catch (error) {
            hapticFeedback.notificationOccurred.ifAvailable("error");
        }
    };

    return (
        <Modal
            header={<ModalHeader>Введите ваше имя</ModalHeader>}
            modal
            open={isOpen}
            onOpenChange={(open) => setIsOpen(open)}
        >
            <Stack gap={1}>
                <Input
                    header="Введите ваше имя"
                    value={inputNickname}
                    onChange={(e) => setInputNickname(e.target.value)}
                    status={
                        validateNickname(inputNickname) ? "default" : "error"
                    }
                    after={
                        <Tappable
                            Component="div"
                            style={{ display: "flex" }}
                            onClick={() => {
                                hapticFeedback.selectionChanged.ifAvailable();
                                setInputNickname("");
                            }}
                        >
                            <CloseIcon />
                        </Tappable>
                    }
                />
                <Button
                    size="l"
                    stretched
                    disabled={!validateNickname(inputNickname)}
                    onClick={() => {
                        hapticFeedback.notificationOccurred.ifAvailable(
                            "success"
                        );
                        if (validateNickname(inputNickname)) {
                            changeNickname(inputNickname);
                            setIsOpen(false);
                        }
                    }}
                >
                    Сохранить
                </Button>
            </Stack>
        </Modal>
    );
};
