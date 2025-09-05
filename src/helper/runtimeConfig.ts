let cachedConfig: Record<string, string> | null = null;

export async function loadRuntimeConfig(): Promise<Record<string, string>> {
    if (cachedConfig) return cachedConfig;

    try {
        const res = await fetch("/runtime-config.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Record<string, string>;

        // Replace "$VARS" placeholders with values from import.meta.env when available.
        // If a placeholder cannot be resolved, store an empty string so callers can
        // fall back to their own defaults (e.g., import.meta.env values in code).
        const resolved: Record<string, string> = {};
        for (const [k, v] of Object.entries(data ?? {})) {
            if (typeof v === "string" && /^\$[A-Z0-9_]+$/.test(v)) {
                const envKey = v.slice(1);
                const envVal = (import.meta as any)?.env?.[envKey] as
                    | string
                    | undefined;
                resolved[k] = envVal ?? ""; // empty string triggers fallback in callers
            } else {
                resolved[k] = v as string;
            }
        }

        cachedConfig = resolved;
        return cachedConfig;
    } catch {
        cachedConfig = {};
        return cachedConfig;
    }
}

export function getRuntimeConfigValue(
    key: string,
    fallback?: string
): string | undefined {
    if (cachedConfig && key in cachedConfig) return cachedConfig[key];
    return fallback;
}
