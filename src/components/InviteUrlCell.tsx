import { api } from "@/convex/_generated/api";
import ShareIcon from "@mui/icons-material/Share";
import {
    hapticFeedback,
    retrieveLaunchParams,
    shareURL,
} from "@telegram-apps/sdk-react";
import { Cell } from "@telegram-apps/telegram-ui";
import { useQuery } from "convex/react";
import { useState } from "react";
import { loadRuntimeConfig } from "@/helper/runtimeConfig";
import { useUser } from "@/contexts/UserContext";

type InviteUrlCellProps = {
    copiedDuration?: number;
};

export const InviteUrlCell = ({
    copiedDuration = 1100,
}: InviteUrlCellProps) => {
    const { userId } = useUser();
    const [showCopied, setShowCopied] = useState(false);
    const me = useQuery(api.users.getUser, userId ? { userId } : "skip");

    const initData = retrieveLaunchParams();
    console.log(`initData:`, initData);

    const [miniAppUrl, setMiniAppUrl] = useState<string | undefined>(
        import.meta.env.VITE_MINI_APP_URL as string | undefined
    );

    // Lazy-load runtime config once when component mounts
    useState(() => {
        void (async () => {
            const cfg = await loadRuntimeConfig();
            if (cfg.VITE_MINI_APP_URL) setMiniAppUrl(cfg.VITE_MINI_APP_URL);
        })();
        return undefined;
    });

    const url = `${miniAppUrl}?startapp=friend_${me?._id}`;

    const copy = () => {
        navigator.clipboard
            .writeText(url)
            .then(() => {
                setShowCopied(true);
                setTimeout(() => {
                    setShowCopied(false);
                }, copiedDuration);
            })
            .catch((error) => {
                if (error.name !== "NotAllowedError") {
                    console.error("Failed to copy:", error);
                }
            });
    };

    return (
        <Cell
            after={
                <ShareIcon
                    sx={{ zIndex: 1 }}
                    onClick={() => {
                        shareURL.ifAvailable(url);
                    }}
                />
            }
            subtitle="Приглашение в друзья"
            onClick={() => {
                if (!showCopied) {
                    hapticFeedback.impactOccurred.ifAvailable("medium");
                    copy();
                }
            }}
        >
            {showCopied ? "Скопировано!" : url.replace("https://", "")}
        </Cell>
    );
};
