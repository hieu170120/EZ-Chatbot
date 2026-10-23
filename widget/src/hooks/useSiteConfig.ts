import { useEffect, useState } from "react";
import { useVisitorChatStore } from "../store";
import { fetchSitePublicConfigApi } from "../api/chat.api";
import { useWidgetConfig } from "../context/WidgetContext";

export interface EzChatConfig {
  backendUrl?: string;
  siteId?: string;
  collectPageContext?: boolean;
}

export const isDomainAllowed = (
  currentHostname: string,
  allowedDomains?: string[],
): boolean => {
  if (!allowedDomains || !allowedDomains.length) {
    return true;
  }
  const hostname = (currentHostname || "").toLowerCase().trim();
  if (!hostname) return false;

  return allowedDomains.some((rawPattern) => {
    const pattern = (rawPattern || "").toLowerCase().trim();
    if (!pattern) return false;

    if (pattern === "*") {
      return true;
    }

    if (pattern.startsWith("*.")) {
      const baseDomain = pattern.slice(2);
      return hostname.endsWith(`.${baseDomain}`);
    }

    return hostname === pattern;
  });
};

export function useSiteConfig(backendUrlParam?: string, siteIdParam?: string) {
  const contextConfig = useWidgetConfig();
  const backendUrl = backendUrlParam || contextConfig.backendUrl;
  const siteId = siteIdParam !== undefined ? siteIdParam : contextConfig.siteId;
  const [isChatEnabled, setIsChatEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(siteId));

  const {
    setSiteName,
    setTimeoutSettings,
    setAppearanceSettings,
    setBookingHours,
    setBookingServices,
    setBookingResources,
    setFeatureFlags,
  } = useVisitorChatStore();

  useEffect(() => {
    if (!siteId) {
      return;
    }

    let isMounted = true;

    fetchSitePublicConfigApi(backendUrl, siteId)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          const isEnabled = data.isEnabled !== false;
          const allowedDomains = Array.isArray(data.allowedDomains)
            ? data.allowedDomains
            : [];
          const isAllowed = isDomainAllowed(
            window.location.hostname,
            allowedDomains,
          );

          if (!isEnabled || !isAllowed) {
            setIsChatEnabled(false);
            return;
          }

          setIsChatEnabled(true);

          // Set feature flags from site config (feature/config-site/huyen)
          setFeatureFlags({
            isAiActive: data.isAiActive !== false,
            humanHandoff: data.humanHandoff === true,
            emailTranscript: data.emailTranscript === true,
            useCurrentPageContent: data.useCurrentPageContent === true,
          });

          if (data.name) {
            setSiteName(data.name);
          }
          setTimeoutSettings({
            enableConversationTimeout: data.enableConversationTimeout,
            inactivityTimeoutMinutes: data.inactivityTimeoutMinutes,
            warningTimeMinutes: data.warningTimeMinutes,
            inactivityWarningMessage: data.inactivityWarningMessage,
            timeoutMessage: data.timeoutMessage,
            resetTimerOnBotResponse: data.resetTimerOnBotResponse,
            pauseTimerForAgentChats: data.pauseTimerForAgentChats,
          });
          setAppearanceSettings({
            primaryColor: data.primaryColor,
            backgroundColor: data.backgroundColor,
            botAvatar: data.botAvatar,
            launcherIcon: data.launcherIcon,
            defaultGreetingMessage: data.defaultGreetingMessage,
            chatButtonPosition: data.chatButtonPosition,
            chatWindowTitle: data.chatWindowTitle,
            chatButtonText: data.chatButtonText,
            showAvatar: data.showAvatar,
          });
          setBookingHours(data.bookingHours ?? null);
          if (Array.isArray(data.bookingServices)) {
            setBookingServices(data.bookingServices);
          }
          if (Array.isArray(data.bookingResources)) {
            setBookingResources(data.bookingResources);
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Error fetching public site info", err);
        setIsChatEnabled(false);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    siteId,
    backendUrl,
    setSiteName,
    setTimeoutSettings,
    setAppearanceSettings,
    setBookingHours,
    setBookingServices,
    setBookingResources,
    setFeatureFlags,
  ]);

  return { isChatEnabled, isLoading };
}
