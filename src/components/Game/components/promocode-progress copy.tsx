import { useContext, useMemo, useRef, useEffect, useState } from "react";
import {
    Progress,
    Section,
    Cell,
    Modal,
    Placeholder,
    Button,
} from "@telegram-apps/telegram-ui";
import { GameContext } from "@/components/Game/context/game-context";
import { formatNumberWithSpaces } from "@/helper/formatter";
import { ModalHeader } from "@telegram-apps/telegram-ui/dist/components/Overlays/Modal/components/ModalHeader/ModalHeader";
import { hapticFeedback, useLaunchParams } from "@telegram-apps/sdk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CopyButton } from "@/components/CopyButton";

export default function PromocodeProgress() {
    const lp = useLaunchParams(true);
    const { status } = useContext(GameContext);
    const game = useQuery(api.games.getInProgressGame, {
        telegramUser: lp.tgWebAppData?.user,
    });
    const score = game?.score ?? 0;

    const recordScore = useQuery(api.games.getRecordScore, {
        telegramUser: lp.tgWebAppData?.user,
    });
    const totalScore = useQuery(api.games.getTotalScore, {
        telegramUser: lp.tgWebAppData?.user,
    });
    type ConvexPromocodeType = {
        _id: Id<"promocodeTypes">;
        discount: number;
        minOrder: number;
        score: number;
        type: "record" | "total";
    };
    const promocodeTypes = useQuery(api.promocodeTypes.getPromocodeTypes);
    const userPromocodes = useQuery(api.promocodes.getUserPromocodes, {
        telegramUser: lp.tgWebAppData?.user,
    });
    const createPromocodeMutation = useMutation(api.promocodes.createPromocode);

    // State for auto-opening promocode modal when a new promocode becomes available
    const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
    const [selectedReadyType, setSelectedReadyType] =
        useState<ConvexPromocodeType | null>(null);
    const [claimLoading, setClaimLoading] = useState(false);
    const [claimedCode, setClaimedCode] = useState<string | null>(null);
    const shownReadyTypeIdsRef = useRef<Set<string>>(new Set());

    // Convex queries are live; no manual revalidation needed
    useEffect(() => {}, []);

    // Capture a stable baseline for total score so we can add live score without double-counting
    const totalBaselineRef = useRef<number>(0);
    const [baselineTick, setBaselineTick] = useState(0);
    useEffect(() => {
        if (totalScore !== undefined) {
            const liveAddon = status === "ongoing" ? score : 0;
            const base = (totalScore ?? 0) - liveAddon;
            const nextBase = base < 0 ? 0 : base;
            if (totalBaselineRef.current !== nextBase) {
                totalBaselineRef.current = nextBase;
                setBaselineTick((t) => t + 1); // force recompute using new baseline
            }
        }
        // Only recompute when totalScore changes; keep baseline stable across live score updates
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalScore, status]);

    type TargetCalc = {
        target: ConvexPromocodeType | null;
        previousThreshold: number;
        pointsLeft: number;
        mode: "record" | "total" | null;
        ready: boolean;
    };

    const calc: TargetCalc = useMemo(() => {
        if (!promocodeTypes) {
            return {
                target: null,
                previousThreshold: 0,
                pointsLeft: Infinity,
                mode: null,
                ready: false,
            };
        }

        const openedTypeIds = new Set<string>(
            (userPromocodes ?? []).map(
                (p: { promocodeTypeId: Id<"promocodeTypes"> }) =>
                    (p.promocodeTypeId as unknown as string) ?? ""
            )
        );

        const recordTypes = (promocodeTypes as ConvexPromocodeType[])
            .filter(
                (pt) =>
                    pt.type === "record" &&
                    !openedTypeIds.has(pt._id as unknown as string)
            )
            .sort((a, b) => a.score - b.score);
        const totalTypes = (promocodeTypes as ConvexPromocodeType[])
            .filter(
                (pt) =>
                    pt.type === "total" &&
                    !openedTypeIds.has(pt._id as unknown as string)
            )
            .sort((a, b) => a.score - b.score);

        const existingRecord = recordScore ?? 0;
        const recordCompareScore =
            status === "ongoing"
                ? Math.max(score, existingRecord)
                : existingRecord;
        const effectiveRecordCeiling = recordCompareScore;
        const effectiveTotalScore =
            totalBaselineRef.current + (status === "ongoing" ? score : 0); // live total only while ongoing

        // If there is any unopened type already reachable, show READY state (no progress to it)
        const hasReadyRecord = recordTypes.some(
            (pt) => pt.score <= effectiveRecordCeiling
        );
        const hasReadyTotal = totalTypes.some(
            (pt) => pt.score <= effectiveTotalScore
        );
        if (hasReadyRecord || hasReadyTotal) {
            return {
                target: null,
                previousThreshold: 0,
                pointsLeft: 0,
                mode: null,
                ready: true,
            };
        }

        const findNext = (list: ConvexPromocodeType[], current: number) => {
            const idx = list.findIndex((pt) => pt.score > current);
            const target = idx >= 0 ? list[idx] : null;
            const previousThreshold = idx > 0 ? list[idx - 1].score : 0;
            return { target, previousThreshold };
        };

        // Determine targets for both modes using live values
        const recNext = findNext(recordTypes, effectiveRecordCeiling);
        const totNext = findNext(totalTypes, effectiveTotalScore);

        // Points left for comparison using appropriate values
        const recCurrentForLeft = status === "ongoing" ? score : existingRecord;
        const recPointsLeft = recNext.target
            ? Math.max(0, recNext.target.score - recCurrentForLeft)
            : Infinity;
        const totPointsLeft = totNext.target
            ? Math.max(0, totNext.target.score - effectiveTotalScore)
            : Infinity;

        if (recPointsLeft <= totPointsLeft) {
            return {
                target: recNext.target,
                previousThreshold: recNext.previousThreshold,
                pointsLeft: recPointsLeft,
                mode: "record",
                ready: false,
            };
        }
        return {
            target: totNext.target,
            previousThreshold: totNext.previousThreshold,
            pointsLeft: totPointsLeft,
            mode: "total",
            ready: false,
        };
        // We intentionally omit totalBaselineRef.current from deps to avoid thrashing; its changes coincide with stats changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        promocodeTypes,
        userPromocodes,
        recordScore,
        score,
        status,
        baselineTick,
    ]);

    // Determine the first unopened type that has become ready now
    const nextReadyType: ConvexPromocodeType | null = useMemo(() => {
        if (!promocodeTypes) return null;

        const openedTypeIds = new Set<string>(
            (userPromocodes ?? []).map(
                (p: { promocodeTypeId: Id<"promocodeTypes"> }) =>
                    (p.promocodeTypeId as unknown as string) ?? ""
            )
        );

        const existingRecord = recordScore ?? 0;
        const recordCompareScore =
            status === "ongoing"
                ? Math.max(score, existingRecord)
                : existingRecord;
        const effectiveRecordCeiling = recordCompareScore;
        const effectiveTotalScore =
            totalBaselineRef.current + (status === "ongoing" ? score : 0);

        const readyRecord = (promocodeTypes as ConvexPromocodeType[])
            .filter(
                (pt) =>
                    pt.type === "record" &&
                    !openedTypeIds.has(pt._id as unknown as string) &&
                    pt.score <= effectiveRecordCeiling
            )
            .sort((a, b) => a.score - b.score);

        const readyTotal = (promocodeTypes as ConvexPromocodeType[])
            .filter(
                (pt) =>
                    pt.type === "total" &&
                    !openedTypeIds.has(pt._id as unknown as string) &&
                    pt.score <= effectiveTotalScore
            )
            .sort((a, b) => a.score - b.score);

        const candidates = [...readyRecord, ...readyTotal];
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => a.score - b.score);
        return candidates[0] ?? null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        promocodeTypes,
        userPromocodes,
        recordScore,
        score,
        status,
        baselineTick,
    ]);

    // Auto-open the modal once per type when it becomes ready
    useEffect(() => {
        if (
            nextReadyType &&
            !shownReadyTypeIdsRef.current.has(
                nextReadyType._id as unknown as string
            )
        ) {
            shownReadyTypeIdsRef.current.add(
                nextReadyType._id as unknown as string
            );
            setSelectedReadyType(nextReadyType);
            setClaimedCode(null);
            setIsPromoModalOpen(true);
            hapticFeedback.notificationOccurred.ifAvailable("success");
        }
    }, [nextReadyType]);

    const handleClaimPromocode = async () => {
        if (!selectedReadyType) return;
        setClaimLoading(true);
        try {
            const createdId = await createPromocodeMutation({
                telegramUser: lp.tgWebAppData?.user,
                promocodeTypeId: selectedReadyType._id,
            });
            // We don't need to manually refetch; queries are live. Code will be shown from userPromocodes.
            const justCreated = (userPromocodes ?? []).find(
                (p: { _id: string }) =>
                    p._id === (createdId as unknown as string)
            );
            setClaimedCode(justCreated?.code ?? null);
            hapticFeedback.notificationOccurred.ifAvailable("success");
        } catch (e) {
            hapticFeedback.notificationOccurred.ifAvailable("error");
        } finally {
            setClaimLoading(false);
        }
    };

    if (calc.ready) {
        const currentCodeInReady =
            claimedCode ||
            (selectedReadyType
                ? ((userPromocodes ?? []).find(
                      (p: {
                          promocodeTypeId: Id<"promocodeTypes">;
                          code: string;
                      }) =>
                          (p.promocodeTypeId as unknown as string) ===
                          (selectedReadyType._id as unknown as string)
                  )?.code ?? null)
                : null);
        return (
            <>
                <Section>
                    <Cell interactiveAnimation="opacity">
                        Промокод доступен — откройте его во вкладке «Призы»
                    </Cell>
                </Section>
                <Modal
                    header={<ModalHeader>Доступен промокод</ModalHeader>}
                    modal={false}
                    open={isPromoModalOpen}
                    onOpenChange={(open) => setIsPromoModalOpen(open)}
                >
                    <Placeholder
                        description={
                            selectedReadyType
                                ? `На ${formatNumberWithSpaces(
                                      selectedReadyType.discount
                                  )} ₽ от ${formatNumberWithSpaces(
                                      selectedReadyType.minOrder
                                  )} ₽`
                                : "Промокод доступен"
                        }
                        header={
                            selectedReadyType
                                ? "Поздравляем!"
                                : "Доступен промокод"
                        }
                    >
                        {currentCodeInReady ? (
                            <CopyButton stretched>
                                {currentCodeInReady}
                            </CopyButton>
                        ) : (
                            <Button
                                mode="filled"
                                size="l"
                                stretched
                                loading={claimLoading}
                                onClick={handleClaimPromocode}
                            >
                                Получить промокод
                            </Button>
                        )}
                    </Placeholder>
                </Modal>
            </>
        );
    }

    if (!calc.target) {
        return (
            <Section>
                <Cell interactiveAnimation="opacity">
                    Все промокоды получены 🎉
                </Cell>
            </Section>
        );
    }

    const current =
        calc.mode === "record"
            ? status === "ongoing"
                ? score
                : (recordScore ?? 0)
            : totalBaselineRef.current + (status === "ongoing" ? score : 0);
    const targetScore = calc.target.score;
    const range = Math.max(1, targetScore - calc.previousThreshold);
    const progressed = Math.max(
        0,
        Math.min(range, current - calc.previousThreshold)
    );
    const clamped = (progressed / range) * 100;
    const pointsLeft = calc.pointsLeft;

    const message =
        calc.mode === "record"
            ? status === "ongoing"
                ? `Осталось ${formatNumberWithSpaces(
                      pointsLeft
                  )} очков в этой игре до промокода`
                : `Осталось ${formatNumberWithSpaces(
                      pointsLeft
                  )} очков до промокода`
            : `Осталось ${formatNumberWithSpaces(
                  pointsLeft
              )} очков до промокода`;

    const currentCode =
        claimedCode ||
        (selectedReadyType
            ? ((userPromocodes ?? []).find(
                  (p: {
                      promocodeTypeId: Id<"promocodeTypes">;
                      code: string;
                  }) =>
                      (p.promocodeTypeId as unknown as string) ===
                      (selectedReadyType._id as unknown as string)
              )?.code ?? null)
            : null);

    return (
        <>
            <Section>
                <Cell
                    interactiveAnimation="opacity"
                    subhead={
                        <Progress
                            value={clamped}
                            style={{
                                height: "1em",
                                marginTop: "0.2em",
                                marginBottom: "0.4em",
                            }}
                        />
                    }
                >
                    {message}
                </Cell>
            </Section>

            <Modal
                header={<ModalHeader>Доступен промокод</ModalHeader>}
                modal={false}
                open={isPromoModalOpen}
                onOpenChange={(open) => setIsPromoModalOpen(open)}
            >
                <Placeholder
                    description={
                        selectedReadyType
                            ? `На ${formatNumberWithSpaces(
                                  selectedReadyType.discount
                              )} ₽ от ${formatNumberWithSpaces(
                                  selectedReadyType.minOrder
                              )} ₽`
                            : "Промокод доступен"
                    }
                    header={
                        selectedReadyType ? "Поздравляем!" : "Доступен промокод"
                    }
                >
                    {currentCode ? (
                        <CopyButton stretched>{currentCode}</CopyButton>
                    ) : (
                        <Button
                            mode="filled"
                            size="l"
                            stretched
                            loading={claimLoading}
                            onClick={handleClaimPromocode}
                        >
                            Получить промокод
                        </Button>
                    )}
                </Placeholder>
            </Modal>
        </>
    );
}
