import {
    useLaunchParams,
    miniApp,
    useSignal,
    viewport,
} from "@telegram-apps/sdk-react";
import { AppRoot, Snackbar } from "@telegram-apps/telegram-ui";
import { Navigate, Route, Routes, HashRouter } from "react-router-dom";
import { routes } from "@/navigation/routes.tsx";
import GameProvider from "@/components/Game/context/game-context";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@/contexts/UserContext";

export function App() {
    const lp = useLaunchParams(true);
    const isDark = useSignal(miniApp.isDark);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [newFriend, setNewFriend] = useState<boolean>(false);
    const { userId, isLoading: isUserLoading } = useUser();
    const addFriend = useMutation(api.friendships.addFriend);

    useEffect(() => {
        const init = async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            if (viewport.expand.isAvailable()) {
                viewport.expand();
            }
        };
        init();

        const handleScroll = () => {};
        const container = scrollContainerRef.current;
        container?.addEventListener("scroll", handleScroll);

        return () => {
            container?.removeEventListener("scroll", handleScroll);
        };
    }, []);

    // Handle friend invitation once userId is available
    useEffect(() => {
        if (!userId) return;

        const startParam = lp.tgWebAppData?.startParam;
        if (startParam && startParam.startsWith("friend_")) {
            const friendUserId = startParam.split("_")[1];
            addFriend({
                userId,
                friendId: friendUserId as Id<"users">,
            })
                .then(() => {
                    setNewFriend(true);
                })
                .catch((e) => {
                    console.log(`Failed to add friend: `, e);
                });
        }
    }, [userId, lp.tgWebAppData?.startParam, addFriend]);

    return (
        <AppRoot
            appearance={isDark ? "dark" : "light"}
            platform={
                ["macos", "ios"].includes(lp.platform as string)
                    ? "ios"
                    : "base"
            }
            style={{
                height: "100lvh",
                overflow: "hidden",
                position: "relative",
            }}
        >
            <div
                ref={scrollContainerRef}
                style={{
                    overflow: "auto",
                    height: "100%",
                    minHeight: "100%",
                    overscrollBehavior: "none",
                }}
            >
                {!isUserLoading && userId && (
                    <HashRouter>
                        <GameProvider>
                            <Routes>
                                {routes.map((route) => (
                                    <Route key={route.path} {...route} />
                                ))}
                                <Route
                                    path="/"
                                    element={<Navigate to="/game" />}
                                />
                                <Route
                                    path="*"
                                    element={<Navigate to="/game" />}
                                />
                            </Routes>
                        </GameProvider>
                    </HashRouter>
                )}
                {newFriend && (
                    <Snackbar
                        style={{ zIndex: 3 }}
                        onClose={() => setNewFriend(false)}
                    >
                        Новый друг добавлен!
                    </Snackbar>
                )}
            </div>
        </AppRoot>
    );
}
