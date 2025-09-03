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

export function App() {
    const lp = useLaunchParams(true);
    const isDark = useSignal(miniApp.isDark);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [newFriend, setNewFriend] = useState<boolean>(false);
    const [isUserEnsured, setIsUserEnsured] = useState<boolean>(false);
    const addFriend = useMutation(api.friendships.addFriend);
    const ensureUser = useMutation(api.users.ensureUser);

    useEffect(() => {
        const init = async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            if (viewport.expand.isAvailable()) {
                viewport.expand();
            }
            try {
                await ensureUser({ telegramUser: lp.tgWebAppData?.user });
                setIsUserEnsured(true);
            } catch (e) {
                console.log("Failed to ensure user:", e);
            }
        };
        init();

        const handleScroll = () => {};
        const container = scrollContainerRef.current;
        container?.addEventListener("scroll", handleScroll);

        // Check start param
        const startParam = lp.tgWebAppData?.startParam;
        if (startParam && startParam.startsWith("friend_")) {
            const userId = startParam.split("_")[1];
            addFriend({
                telegramUser: lp.tgWebAppData?.user,
                friendId: userId as Id<"users">,
            })
                .then(() => {
                    setNewFriend(true);
                })
                .catch((e) => {
                    console.log(`Failed to add friend: `, e);
                });
        }
        return () => {
            container?.removeEventListener("scroll", handleScroll);
        };
    }, []);

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
                {isUserEnsured && (
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
