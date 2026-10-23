export interface WidgetConfig {
  siteId: string;
  backendUrl: string;
  isTestMode: boolean;
  isOpenDefault: boolean;
  collectPageContext: boolean;
}

export interface WindowEzChatConfig {
  siteId?: string;
  backendUrl?: string;
  isTestMode?: boolean;
  isOpenDefault?: boolean;
  collectPageContext?: boolean;
}

declare global {
  interface Window {
    EzChatConfig?: WindowEzChatConfig;
  }
}

/**
 * Normalizes a backend URL by trimming whitespace and removing trailing slashes.
 */
export const normalizeBackendUrl = (url?: string): string => {
  if (!url || typeof url !== "string") {
    return "http://localhost:3000";
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return "http://localhost:3000";
  }
  return trimmed.replace(/\/+$/, "");
};

/**
 * Resolves widget configuration once from all supported sources with priority:
 * 1. Explicit overrides argument
 * 2. URL search parameters (?siteId=..., ?backendUrl=..., ?testMode=..., ?openDefault=..., ?pageContext=...)
 * 3. Script dataset attributes (data-site-id, data-backend-url, data-test-mode, data-open-default, data-page-context)
 * 4. Existing window.EzChatConfig
 * 5. Environment variables (VITE_BACKEND_URL)
 * 6. Sane defaults
 */
export function resolveWidgetConfig(
  overrides?: Partial<WidgetConfig>,
): WidgetConfig {
  const hasWindow = typeof window !== "undefined";
  const hasDoc = typeof document !== "undefined";

  const script = hasDoc
    ? (document.currentScript as HTMLScriptElement | null) ||
      document.querySelector("script[data-site-id]")
    : null;

  const urlParams = hasWindow
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const existingWindowConfig = hasWindow ? window.EzChatConfig : undefined;

  const isTestMode =
    overrides?.isTestMode ??
    (urlParams.get("testMode") === "true" ||
      (script as HTMLScriptElement | null)?.dataset.testMode === "true" ||
      existingWindowConfig?.isTestMode === true ||
      false);

  const siteId =
    overrides?.siteId ??
    urlParams.get("siteId") ??
    (script as HTMLScriptElement | null)?.dataset.siteId ??
    existingWindowConfig?.siteId ??
    "";

  const rawBackendUrl =
    overrides?.backendUrl ??
    urlParams.get("backendUrl") ??
    (script as HTMLScriptElement | null)?.dataset.backendUrl ??
    existingWindowConfig?.backendUrl ??
    import.meta.env?.VITE_BACKEND_URL ??
    "http://localhost:3000";

  const backendUrl = normalizeBackendUrl(rawBackendUrl);

  const isOpenDefault =
    overrides?.isOpenDefault ??
    (urlParams.get("openDefault") === "true" ||
      (script as HTMLScriptElement | null)?.dataset.openDefault === "true" ||
      existingWindowConfig?.isOpenDefault === true ||
      isTestMode);

  const collectPageContext =
    overrides?.collectPageContext ??
    (urlParams.get("pageContext") !== null
      ? urlParams.get("pageContext")?.toLowerCase() !== "false"
      : (script as HTMLScriptElement | null)?.dataset.pageContext
        ? (
            script as HTMLScriptElement | null
          )?.dataset.pageContext?.toLowerCase() !== "false"
        : existingWindowConfig?.collectPageContext !== false);

  return {
    siteId: String(siteId).trim(),
    backendUrl,
    isTestMode,
    isOpenDefault,
    collectPageContext,
  };
}
