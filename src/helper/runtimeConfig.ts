let cachedConfig: Record<string, string> | null = null;

export async function loadRuntimeConfig(): Promise<Record<string, string>> {
    if (cachedConfig) return cachedConfig;

    try {
        const res = await fetch("/runtime-config.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Record<string, string>;
        cachedConfig = data || {};
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
