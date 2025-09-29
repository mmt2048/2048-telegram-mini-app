import { Button } from "@telegram-apps/telegram-ui";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { hapticFeedback } from "@telegram-apps/sdk-react";
import { useState } from "react";

type CopyButtonProps = {
    children: string;
    mode?:
        | "bezeled"
        | "filled"
        | "plain"
        | "gray"
        | "outline"
        | "white"
        | undefined;
    size?: "m" | "l" | "s";
    stretched?: boolean;
    copiedDuration?: number;
    disabled?: boolean;
    id?: string;
};

export const CopyButton = ({
    children,
    mode = "bezeled",
    stretched = true,
    size = "m",
    copiedDuration = 1100,
    disabled = false,
    id,
}: CopyButtonProps) => {
    const [showCopied, setShowCopied] = useState(false);

    const copy = () => {
        if (disabled) return;
        navigator.clipboard
            .writeText(children)
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
        <Button
            id={id}
            disabled={disabled}
            before={showCopied ? undefined : <ContentCopyIcon />}
            mode={mode}
            size={size}
            stretched={stretched}
            onClick={() => {
                hapticFeedback.impactOccurred.ifAvailable("medium");
                copy();
            }}
        >
            {showCopied ? "Скопировано!" : children}
        </Button>
    );
};
