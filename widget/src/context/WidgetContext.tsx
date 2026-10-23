/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  resolveWidgetConfig,
  type WidgetConfig,
} from "../config/widget-config";
import { createChatApiClient, type ChatApiClient } from "../api/chat.api";

export interface WidgetContextValue {
  config: WidgetConfig;
  apiClient: ChatApiClient;
}

const WidgetContext = createContext<WidgetContextValue | null>(null);

export interface WidgetProviderProps {
  config?: WidgetConfig;
  children: ReactNode;
}

export const WidgetProvider: React.FC<WidgetProviderProps> = ({
  config: initialConfig,
  children,
}) => {
  const config = useMemo(
    () => initialConfig ?? resolveWidgetConfig(),
    [initialConfig],
  );

  const apiClient = useMemo(
    () =>
      createChatApiClient({
        backendUrl: config.backendUrl,
        siteId: config.siteId,
      }),
    [config.backendUrl, config.siteId],
  );

  const value = useMemo<WidgetContextValue>(
    () => ({
      config,
      apiClient,
    }),
    [config, apiClient],
  );

  return (
    <WidgetContext.Provider value={value}>{children}</WidgetContext.Provider>
  );
};

/**
 * Hook to access the full widget context (config & apiClient).
 */
export const useWidgetContext = (): WidgetContextValue => {
  const context = useContext(WidgetContext);
  if (!context) {
    // Fallback gracefully to default config & apiClient if rendered outside provider
    const fallbackConfig = resolveWidgetConfig();
    return {
      config: fallbackConfig,
      apiClient: createChatApiClient({
        backendUrl: fallbackConfig.backendUrl,
        siteId: fallbackConfig.siteId,
      }),
    };
  }
  return context;
};

/**
 * Hook to access the resolved widget configuration.
 */
export const useWidgetConfig = (): WidgetConfig => {
  return useWidgetContext().config;
};

/**
 * Hook to access the pre-bound ChatApiClient.
 */
export const useChatApiClient = (): ChatApiClient => {
  return useWidgetContext().apiClient;
};
