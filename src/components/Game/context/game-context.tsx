import {
    PropsWithChildren,
    createContext,
    useCallback,
    useEffect,
    useReducer,
    useRef,
} from "react";
import { isNil, throttle, debounce } from "lodash";
import { useLocation } from "react-router-dom";
import {
    mergeAnimationDuration,
    tileCountPerDimension,
} from "@/components/Game/constants";
import { Tile } from "@/components/Game/models/tile";
import gameReducer, {
    initialState,
} from "@/components/Game/reducers/game-reducer";
import { hapticFeedback } from "@telegram-apps/sdk-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@/contexts/UserContext";

type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

export const GameContext = createContext({
    status: "ongoing",
    moveTiles: (_: MoveDirection) => {},
    getTiles: () => [] as Tile[],
    startGame: () => {},
    restartGame: () => {},
});

export default function GameProvider({ children }: PropsWithChildren) {
    const startNewGameMutation = useMutation(api.games.startNewGame);
    const setGameScoreMutation = useMutation(api.games.setGameScore);
    const finishGameMutation = useMutation(api.games.finishGame);
    const { userId } = useUser();

    // Debounced, latest-only score synchronization with single in-flight request
    const inFlightRef = useRef(false);
    const inFlightPromiseRef = useRef<Promise<void> | null>(null);
    const latestQueuedScoreRef = useRef<number | null>(null);
    const debouncedSenderRef = useRef<ReturnType<typeof debounce> | null>(null);

    const sendScore = useCallback(
        async (score: number): Promise<void> => {
            // If a request is in-flight, just record the latest score and piggyback
            if (inFlightRef.current) {
                latestQueuedScoreRef.current = score;
                return inFlightPromiseRef.current ?? Promise.resolve();
            }

            inFlightRef.current = true;
            const p = (async () => {
                try {
                    if (userId) {
                        await setGameScoreMutation({
                            score: score,
                            userId,
                        });
                    }
                } catch (error) {
                    console.error("Error pushing score:", error);
                } finally {
                    inFlightRef.current = false;
                }
            })();

            inFlightPromiseRef.current = p;
            await p;

            // If a newer score was queued while we were sending, send it next
            if (latestQueuedScoreRef.current !== null) {
                const next = latestQueuedScoreRef.current;
                latestQueuedScoreRef.current = null;
                await sendScore(next);
            }
        },
        [setGameScoreMutation, userId]
    );

    const pushScore = useCallback(
        (score: number) => {
            if (!debouncedSenderRef.current) {
                debouncedSenderRef.current = debounce((s: number) => {
                    void sendScore(s);
                }, 300);
            }
            latestQueuedScoreRef.current = score;
            debouncedSenderRef.current(score);
        },
        [sendScore]
    );

    const flushScore = useCallback(
        async (finalScore?: number) => {
            if (typeof finalScore === "number") {
                latestQueuedScoreRef.current = finalScore;
            }

            // Flush any pending debounce immediately
            if (
                debouncedSenderRef.current &&
                (debouncedSenderRef.current as any).flush
            ) {
                (debouncedSenderRef.current as any).flush();
            }

            // If there is a queued score, send it
            if (latestQueuedScoreRef.current !== null) {
                const s = latestQueuedScoreRef.current;
                latestQueuedScoreRef.current = null;
                await sendScore(s);
                return;
            }

            // Otherwise, wait for in-flight send to complete if any
            if (inFlightPromiseRef.current) {
                await inFlightPromiseRef.current;
            }
        },
        [sendScore]
    );

    const finishCurrentGame = useCallback(
        async (finalScore: number) => {
            try {
                await flushScore(finalScore);
                if (userId) {
                    await finishGameMutation({
                        userId,
                    });
                }
            } catch (error) {
                console.error("Error finishing game:", error);
            }
        },
        [finishGameMutation, flushScore, userId]
    );

    const loadSavedState = () => {
        try {
            const savedState = localStorage.getItem("gameState");
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                if (parsedState.tilesByIds.length > 0) {
                    return {
                        ...parsedState,
                        board: parsedState.board.map((row: any) => [...row]),
                        tiles: Object.fromEntries(
                            Object.entries(parsedState.tiles).map(
                                ([id, tile]: [string, any]) => [id, { ...tile }]
                            )
                        ),
                        tilesByIds: [...parsedState.tilesByIds],
                        hasChanged: false,
                    };
                }
            }
        } catch (error) {
            console.error("Error loading saved state:", error);
        }
        return initialState;
    };

    const [gameState, dispatch] = useReducer(gameReducer, loadSavedState());
    const initializationPromise = useRef<Promise<void> | null>(null);

    const getEmptyCells = () => {
        const results: [number, number][] = [];

        for (let x = 0; x < tileCountPerDimension; x++) {
            for (let y = 0; y < tileCountPerDimension; y++) {
                if (isNil(gameState.board[y][x])) {
                    results.push([x, y]);
                }
            }
        }
        return results;
    };

    const appendRandomTile = () => {
        const emptyCells = getEmptyCells();
        if (emptyCells.length > 0) {
            const cellIndex = Math.floor(Math.random() * emptyCells.length);
            const newTile = {
                position: emptyCells[cellIndex],
                value: Math.random() < 0.9 ? 2 : 4,
            };
            dispatch({ type: "create_tile", tile: newTile });
        }
    };

    const getTiles = () => {
        return gameState.tilesByIds
            .map((tileId) => gameState.tiles[tileId])
            .filter((tile) => tile !== undefined);
    };

    const moveTiles = useCallback(
        throttle(
            (type: MoveDirection) => {
                dispatch({ type });
            },
            mergeAnimationDuration * 1.05,
            { trailing: false }
        ),
        [dispatch]
    );

    const startGame = async () => {
        if (initializationPromise.current) {
            return initializationPromise.current;
        }

        initializationPromise.current = (async () => {
            try {
                if (userId) {
                    await startNewGameMutation({
                        userId,
                    });
                }
                dispatch({ type: "reset_game" });
                dispatch({ type: "update_status", status: "ongoing" });
            } catch (error) {
                console.error("Error starting new game:", error);
                // Still start the game locally even if API call fails
                dispatch({ type: "reset_game" });
                dispatch({ type: "update_status", status: "ongoing" });
            } finally {
                // Clear the promise after initialization is complete
                initializationPromise.current = null;
            }
        })();

        return initializationPromise.current;
    };

    const restartGame = useCallback(async () => {
        try {
            await finishCurrentGame(gameState.score);
        } catch (error) {
            console.error("Error finishing game on restart:", error);
        }
        await startGame();
    }, [finishCurrentGame, gameState.score, startGame]);

    // Handle game initialization after reset
    useEffect(() => {
        if (
            gameState.tilesByIds.length === 0 &&
            gameState.status === "ongoing"
        ) {
            appendRandomTile();
            appendRandomTile();
        }
    }, [gameState.tilesByIds.length, gameState.status]);

    // Initial game start
    useEffect(() => {
        if (gameState.status === "init") {
            void startGame();
        }
    }, [gameState.status]);

    useEffect(() => {
        if (gameState.hasChanged) {
            setTimeout(() => {
                hapticFeedback.selectionChanged.ifAvailable();
                dispatch({ type: "clean_up" });
                appendRandomTile();
            }, mergeAnimationDuration);
        }
    }, [gameState.hasChanged]);

    // Sync score to backend on every move (debounced, latest-only)
    useEffect(() => {
        if (gameState.hasChanged && gameState.status === "ongoing") {
            void pushScore(gameState.score);
        }
    }, [gameState.hasChanged, gameState.score, gameState.status, pushScore]);

    useEffect(() => {
        if (!gameState.hasChanged) {
            checkGameState();
        }
    }, [gameState.hasChanged]);

    // Save game state to localStorage
    useEffect(() => {
        localStorage.setItem("gameState", JSON.stringify(gameState));
    }, [gameState]);

    // Removed auto-finish on loss; finishing is now triggered explicitly on restart

    // Save game score when user switches tabs or navigates away
    useEffect(() => {
        const handleVisibilityChange = () => {
            console.log("Visibility changed:", {
                isHidden: document.hidden,
                status: gameState.status,
                score: gameState.score,
            });

            if (document.hidden && gameState.status === "ongoing") {
                void flushScore(gameState.score);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        console.log("Added visibility change listener");

        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
            console.log("Removed visibility change listener");
        };
    }, [gameState.score, gameState.status, flushScore]);

    // Save game score when navigating away from game page
    const location = useLocation();
    const prevLocationRef = useRef(location);

    useEffect(() => {
        const wasOnGamePage = prevLocationRef.current.pathname === "/game";
        const isLeavingGamePage =
            wasOnGamePage && location.pathname !== "/game";

        if (isLeavingGamePage && gameState.status === "ongoing") {
            void flushScore(gameState.score);
        }

        prevLocationRef.current = location;
    }, [location.pathname, gameState.score, gameState.status, flushScore]);

    const checkGameState = () => {
        const { tiles, board } = gameState;

        // Check for empty cells
        for (let y = 0; y < tileCountPerDimension; y++) {
            for (let x = 0; x < tileCountPerDimension; x++) {
                if (isNil(board[y][x])) {
                    return; // Game not over, empty cell found
                }
            }
        }

        // Check for possible merges horizontally
        for (let y = 0; y < tileCountPerDimension; y++) {
            for (let x = 0; x < tileCountPerDimension - 1; x++) {
                if (tiles[board[y][x]].value === tiles[board[y][x + 1]].value) {
                    return; // Game not over, horizontal merge possible
                }
            }
        }

        // Check for possible merges vertically
        for (let y = 0; y < tileCountPerDimension - 1; y++) {
            for (let x = 0; x < tileCountPerDimension; x++) {
                if (tiles[board[y][x]].value === tiles[board[y + 1][x]].value) {
                    return; // Game not over, vertical merge possible
                }
            }
        }

        dispatch({ type: "update_status", status: "lost" });
    };

    return (
        <GameContext.Provider
            value={{
                status: gameState.status,
                getTiles,
                moveTiles,
                startGame,
                restartGame,
            }}
        >
            {children}
        </GameContext.Provider>
    );
}
