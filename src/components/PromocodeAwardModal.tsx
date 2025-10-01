import { useEffect, useMemo, useRef, useState } from "react";
import { hapticFeedback } from "@telegram-apps/sdk-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Modal, Text } from "@telegram-apps/telegram-ui";
import type { Id } from "@/convex/_generated/dataModel";
import { ModalHeader } from "@telegram-apps/telegram-ui/dist/components/Overlays/Modal/components/ModalHeader/ModalHeader";
import PromocodeButton from "@/components/PromocodeButton";
import { Stack } from "@mui/material";
import { useUser } from "@/contexts/UserContext";

export const PromocodeAwardModal: React.FC = () => {
    const { userId } = useUser();

    const promocodes = useQuery(
        api.promocodes.getUserPromocodes,
        userId ? { userId } : "skip"
    );
    const promocodeTypes = useQuery(api.promocodeTypes.getPromocodeTypes, {});

    const seenIdsRef = useRef<Set<string>>(new Set());
    const initializedRef = useRef(false);

    const [activePromocodeId, setActivePromocodeId] =
        useState<Id<"promocodes"> | null>(null);
    const [justOpenedCode, setJustOpenedCode] = useState<string | null>(null);

    const STICKER_URLS = useMemo(
        () => [
            "https://media.tenor.com/-iVTLJKEuPMAAAAi/spotty-vk-spotty.gif",
            "https://media.tenor.com/8vGIcpuiYpsAAAAi/among-us.gif",
            "https://media.tenor.com/8eZe6RXW6F4AAAAi/utya-utya-duck.gif",
            "https://media.tenor.com/LuHR3CQcFBkAAAAi/happy.gif",
            "https://media.tenor.com/NFAZkuLYdqwAAAAi/%EB%AA%A8%EB%AA%A8%EC%B0%8C-%ED%8C%94%EC%A7%9D%ED%8C%94%EC%A7%9D.gif",
            "https://media.tenor.com/kvmY6UnA5vIAAAAi/gatito.gif",
            "https://media.tenor.com/1_1qIqjAjiIAAAAi/doge.gif",
            "https://media.tenor.com/yho732qHpBcAAAAi/%D0%BE%D1%87%D0%BA%D0%B8.gif",
            "https://media.tenor.com/C35t4Pf5GlgAAAAi/peach-and-goma-cute.gif",
        ],
        []
    );

    const stickerUrl = useMemo(() => {
        if (!activePromocodeId) return STICKER_URLS[0];
        const idx = Math.floor(Math.random() * STICKER_URLS.length);
        return STICKER_URLS[idx];
    }, [activePromocodeId, STICKER_URLS]);

    // Build a lookup for type details
    const typeById = useMemo(() => {
        const map = new Map<string, any>();
        (promocodeTypes ?? []).forEach((t: any) => {
            map.set(t._id as unknown as string, t);
        });
        return map;
    }, [promocodeTypes]);

    const activePromocode = useMemo(() => {
        return promocodes?.find(
            (p) =>
                (p._id as unknown as string) ===
                (activePromocodeId as unknown as string)
        );
    }, [promocodes, activePromocodeId]);

    const activeType = useMemo(() => {
        if (!activePromocode) return null;
        return (
            typeById.get(
                activePromocode.promocodeTypeId as unknown as string
            ) ?? null
        );
    }, [activePromocode, typeById]);

    // Detect newly created (awarded) promocodes and show modal for unopened ones
    useEffect(() => {
        if (!promocodes) return;

        // Initialize seen set on first load to avoid showing modal for existing items
        if (!initializedRef.current) {
            promocodes.forEach((p) => {
                seenIdsRef.current.add(p._id as unknown as string);
            });
            initializedRef.current = true;
            return;
        }

        for (const p of promocodes) {
            const idStr = p._id as unknown as string;
            if (!seenIdsRef.current.has(idStr)) {
                seenIdsRef.current.add(idStr);
                if (!p.opened) {
                    setActivePromocodeId(p._id);
                    setJustOpenedCode(null);
                    hapticFeedback.notificationOccurred.ifAvailable("success");
                    break;
                }
            }
        }
    }, [promocodes, hapticFeedback.notificationOccurred]);

    const onClose = () => {
        setActivePromocodeId(null);
        setJustOpenedCode(null);
    };

    // No longer used; handled by PromocodeButtons

    if (!activePromocode || !activeType) return null;

    return (
        <Modal
            header={<ModalHeader>Новый промокод</ModalHeader>}
            modal
            open={!!activePromocode}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Stack gap={1} alignItems="center">
                <img
                    alt="Telegram sticker"
                    src={stickerUrl}
                    style={{
                        display: "block",
                        width: "144px",
                        height: "144px",
                    }}
                />
                <Text>
                    Вам доступен промокод на {activeType.discount} ₽ от{" "}
                    {activeType.minOrder} ₽
                </Text>
                <PromocodeButton
                    promocodeId={activePromocode._id}
                    code={justOpenedCode ?? activePromocode.code}
                    opened={activePromocode.opened || !!justOpenedCode}
                    size="l"
                    stretched
                    onOpened={(c) => setJustOpenedCode(c)}
                />
            </Stack>
        </Modal>
    );
};

export default PromocodeAwardModal;
