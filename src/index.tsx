import ReactDOM from "react-dom/client";
import { StrictMode } from "react";
import { retrieveLaunchParams } from "@telegram-apps/sdk-react";

import { Root } from "@/components/Root.tsx";
import { EnvUnsupported } from "@/components/EnvUnsupported.tsx";
import { init } from "@/init.ts";
import { loadRuntimeConfig } from "@/helper/runtimeConfig";

import "@telegram-apps/telegram-ui/dist/styles.css";
import "./index.css";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// Mock the environment in case, we are outside Telegram.
import "./mockEnv.ts";

const root = ReactDOM.createRoot(document.getElementById("root")!);

void (async () => {
    try {
        // Ensure runtime configuration is loaded before app bootstraps
        const config = await loadRuntimeConfig();

        const launchParams = retrieveLaunchParams();
        const { tgWebAppPlatform: platform } = launchParams;
        const debug =
            (launchParams.tgWebAppStartParam || "").includes(
                "platformer_debug"
            ) || import.meta.env.DEV;

        await init({
            debug,
            eruda: debug && ["ios", "android"].includes(platform),
            mockForMacOS: platform === "macos",
        });

        const convexUrl =
            (config as Record<string, string>).VITE_CONVEX_URL ||
            ((import.meta.env.VITE_CONVEX_URL as string | undefined) ?? "");
        const convex = new ConvexReactClient(convexUrl as string);

        root.render(
            <StrictMode>
                <ConvexProvider client={convex}>
                    <Root />
                </ConvexProvider>
            </StrictMode>
        );
    } catch (e) {
        root.render(<EnvUnsupported />);
    }
})();
