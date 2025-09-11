import { Button } from "@telegram-apps/telegram-ui";
import { useLaunchParams, hapticFeedback } from "@telegram-apps/sdk-react";
import { useMemo, useRef, useState } from "react";
import { useReward } from "react-rewards";
import { CopyButton } from "@/components/CopyButton";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export const PromocodeButton: React.FC<{
    promocodeId: Id<"promocodes">;
    code: string;
    opened: boolean;
    size?: "m" | "l" | "s";
    stretched?: boolean;
    onOpened?: (code: string) => void;
}> = ({
    promocodeId,
    code,
    opened,
    size = "m",
    stretched = true,
    onOpened,
}) => {
    const lp = useLaunchParams(true);
    const markOpenedMutation = useMutation(api.promocodes.markOpened);

    const [isLoading, setIsLoading] = useState(false);
    const [isOpenedLocal, setIsOpenedLocal] = useState<boolean>(opened);

    const rewardId = useMemo(
        () => `getPromocodeReward-${Math.random().toString(36).slice(2)}`,
        []
    );
    const { reward } = useReward(rewardId, "confetti", {
        angle: 90,
        spread: 45,
        startVelocity: 45,
        // lifetime: 120,
        elementCount: 110,
        elementSize: 11,
        // zIndex: 3,
    });

    const copyWrapRef = useRef<HTMLSpanElement | null>(null);

    const onGet = async () => {
        if (isOpenedLocal) {
            return;
        }
        setIsLoading(true);
        try {
            const patchedId = await markOpenedMutation({
                telegramUser: lp.tgWebAppData?.user,
                promocodeId,
            });
            if (patchedId) {
                setIsOpenedLocal(true);
                // Fire reward AFTER switch so the anchor is the Copy button (centered)
                const fire = () => {
                    try {
                        const wrap = copyWrapRef.current;
                        if (wrap) {
                            const rect = wrap.getBoundingClientRect();
                            const cx = rect.left + rect.width / 2;
                            const cy = rect.top + rect.height / 2;
                            let anchor = document.getElementById(
                                rewardId
                            ) as HTMLSpanElement | null;
                            if (!anchor) {
                                anchor = document.createElement("span");
                                anchor.id = rewardId;
                                document.body.appendChild(anchor);
                            }
                            anchor.style.position = "fixed";
                            anchor.style.left = `${cx}px`;
                            anchor.style.top = `${cy}px`;
                            anchor.style.width = "0px";
                            anchor.style.height = "0px";
                            anchor.style.pointerEvents = "none";
                            anchor.style.zIndex = "2147483647"; // top-most
                        }
                        reward();
                    } catch {}
                };
                if (typeof requestAnimationFrame !== "undefined") {
                    requestAnimationFrame(() => requestAnimationFrame(fire));
                } else {
                    setTimeout(fire, 0);
                }
                hapticFeedback.notificationOccurred.ifAvailable("success");
                onOpened?.(code);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {!isOpenedLocal && (
                <Button
                    size={size}
                    stretched={stretched}
                    mode="filled"
                    loading={isLoading}
                    onClick={onGet}
                >
                    Получить
                </Button>
            )}
            {isOpenedLocal && (
                <span
                    ref={copyWrapRef}
                    style={{ display: "inline-block", width: "100%" }}
                >
                    <CopyButton size={size} stretched={stretched}>
                        {code}
                    </CopyButton>
                </span>
            )}
        </>
    );
};

export default PromocodeButton;
