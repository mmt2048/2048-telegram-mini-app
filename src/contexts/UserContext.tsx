import {
    createContext,
    useContext,
    useEffect,
    useState,
    PropsWithChildren,
} from "react";
import { useLaunchParams } from "@telegram-apps/sdk-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type UserContextType = {
    userId: Id<"users"> | null;
    isLoading: boolean;
    error: Error | null;
};

const UserContext = createContext<UserContextType>({
    userId: null,
    isLoading: true,
    error: null,
});

export function UserProvider({ children }: PropsWithChildren) {
    const lp = useLaunchParams(true);
    const ensureUser = useMutation(api.users.ensureUser);
    const [userId, setUserId] = useState<Id<"users"> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const initUser = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Get or create user once, cache the ID
                const user = await ensureUser({
                    telegramUser: lp.tgWebAppData?.user,
                });

                if (user?._id) {
                    setUserId(user._id);
                } else {
                    throw new Error("Failed to get user ID");
                }
            } catch (err) {
                console.error("Failed to initialize user:", err);
                setError(
                    err instanceof Error ? err : new Error("Unknown error")
                );
            } finally {
                setIsLoading(false);
            }
        };

        if (lp.tgWebAppData?.user) {
            initUser();
        }
    }, [lp.tgWebAppData?.user, ensureUser]);

    return (
        <UserContext.Provider value={{ userId, isLoading, error }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used within UserProvider");
    }
    return context;
}
