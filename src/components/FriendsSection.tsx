import { Avatar, Cell, Section } from "@telegram-apps/telegram-ui";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import { Stack } from "@mui/material";
import { useState } from "react";
import { Skeleton } from "@telegram-apps/telegram-ui";
import { hapticFeedback, useLaunchParams } from "@telegram-apps/sdk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export const FriendsSection = () => {
    const lp = useLaunchParams(true);
    const friends = useQuery(api.friendships.getFriends, {
        telegramUser: lp.tgWebAppData?.user,
    });
    const removeFriendMutation = useMutation(api.friendships.removeFriend);

    const [editMode, setEditMode] = useState(false);

    const toggleEditMode = () => {
        setEditMode(!editMode);
    };

    const getAcronym = (nickname: string): string => {
        if (!nickname) {
            return "";
        }

        const words = nickname.split(" ");
        let acronym = "";

        for (let i = 0; i < Math.min(3, words.length); i++) {
            const word = words[i];
            if (word.length > 0) {
                acronym += word[0].toUpperCase();
            }
        }

        return acronym;
    };

    return (
        <Section
            header={
                <Section.Header>
                    <Stack
                        direction="row"
                        sx={{
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        Список друзей
                        {friends?.length !== 0 && !editMode && (
                            <EditIcon
                                fontSize="small"
                                onClick={() => {
                                    hapticFeedback.impactOccurred.ifAvailable(
                                        "light"
                                    );
                                    toggleEditMode();
                                }}
                            />
                        )}
                        {friends?.length !== 0 && editMode && (
                            <CheckIcon
                                fontSize="small"
                                onClick={() => {
                                    hapticFeedback.impactOccurred.ifAvailable(
                                        "light"
                                    );
                                    toggleEditMode();
                                }}
                            />
                        )}
                    </Stack>
                </Section.Header>
            }
        >
            <Skeleton visible={friends === undefined}>
                {friends !== undefined && friends?.length === 0 && (
                    <Cell interactiveAnimation="opacity">Друзей пока нет</Cell>
                )}
                {friends?.map((friend) => (
                    <Cell
                        key={(friend._id as unknown as string) ?? "friend"}
                        interactiveAnimation="opacity"
                        before={
                            <Avatar
                                acronym={getAcronym(friend.nickname)}
                                size={40}
                            />
                        }
                        after={
                            editMode && (
                                <CloseIcon
                                    fontSize="small"
                                    onClick={() => {
                                        hapticFeedback.impactOccurred.ifAvailable(
                                            "light"
                                        );
                                        removeFriendMutation({
                                            telegramUser: lp.tgWebAppData?.user,
                                            friendId: friend._id,
                                        });
                                    }}
                                />
                            )
                        }
                    >
                        {friend.nickname}
                    </Cell>
                ))}
            </Skeleton>
        </Section>
    );
};
