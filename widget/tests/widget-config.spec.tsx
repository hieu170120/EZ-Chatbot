import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import {
  resolveWidgetConfig,
  normalizeBackendUrl,
} from "../src/config/widget-config";
import { createChatApiClient } from "../src/api/chat.api";
import {
  WidgetProvider,
  useWidgetConfig,
  useChatApiClient,
  useWidgetContext,
} from "../src/context/WidgetContext";

describe("Widget Configuration & API Client Centralization", () => {
  beforeEach(() => {
    delete window.EzChatConfig;
    document
      .querySelectorAll("script[data-site-id]")
      .forEach((el) => el.remove());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("normalizeBackendUrl", () => {
    it("should return default url when input is empty or invalid", () => {
      expect(normalizeBackendUrl()).toBe("http://localhost:3000");
      expect(normalizeBackendUrl("")).toBe("http://localhost:3000");
      expect(normalizeBackendUrl("   ")).toBe("http://localhost:3000");
    });

    it("should trim trailing slashes", () => {
      expect(normalizeBackendUrl("http://localhost:3000/")).toBe(
        "http://localhost:3000",
      );
      expect(normalizeBackendUrl("https://api.example.com///")).toBe(
        "https://api.example.com",
      );
      expect(normalizeBackendUrl("https://api.example.com/v1/")).toBe(
        "https://api.example.com/v1",
      );
    });
  });

  describe("resolveWidgetConfig", () => {
    it("should return sane defaults when no configuration sources exist", () => {
      const config = resolveWidgetConfig();
      expect(config.siteId).toBe("");
      expect(config.backendUrl).toBe("http://localhost:3000");
      expect(config.isTestMode).toBe(false);
      expect(config.isOpenDefault).toBe(false);
      expect(config.collectPageContext).toBe(true);
    });

    it("should resolve from window.EzChatConfig", () => {
      window.EzChatConfig = {
        siteId: "site-from-window",
        backendUrl: "https://window.example.com/",
        isTestMode: true,
        isOpenDefault: true,
        collectPageContext: false,
      };

      const config = resolveWidgetConfig();
      expect(config.siteId).toBe("site-from-window");
      expect(config.backendUrl).toBe("https://window.example.com");
      expect(config.isTestMode).toBe(true);
      expect(config.isOpenDefault).toBe(true);
      expect(config.collectPageContext).toBe(false);
    });

    it("should prioritize script dataset attributes over window.EzChatConfig", () => {
      window.EzChatConfig = {
        siteId: "window-site",
        backendUrl: "http://window-api.com",
      };

      const script = document.createElement("script");
      script.setAttribute("data-site-id", "script-site");
      script.setAttribute("data-backend-url", "https://script-api.com/");
      script.setAttribute("data-test-mode", "true");
      script.setAttribute("data-open-default", "true");
      script.setAttribute("data-page-context", "false");
      document.head.appendChild(script);

      const config = resolveWidgetConfig();
      expect(config.siteId).toBe("script-site");
      expect(config.backendUrl).toBe("https://script-api.com");
      expect(config.isTestMode).toBe(true);
      expect(config.isOpenDefault).toBe(true);
      expect(config.collectPageContext).toBe(false);
    });

    it("should prioritize explicit overrides above all", () => {
      window.EzChatConfig = {
        siteId: "window-site",
      };

      const config = resolveWidgetConfig({
        siteId: "override-site",
        backendUrl: "https://override.com",
        isTestMode: false,
        isOpenDefault: true,
        collectPageContext: false,
      });

      expect(config.siteId).toBe("override-site");
      expect(config.backendUrl).toBe("https://override.com");
      expect(config.isTestMode).toBe(false);
      expect(config.isOpenDefault).toBe(true);
      expect(config.collectPageContext).toBe(false);
    });
  });

  describe("createChatApiClient", () => {
    it("should bind backendUrl and default siteId", () => {
      const client = createChatApiClient({
        backendUrl: "https://api.test.com",
        siteId: "test-site-123",
      });

      expect(client.backendUrl).toBe("https://api.test.com");
      expect(client.siteId).toBe("test-site-123");
      expect(typeof client.startConversation).toBe("function");
      expect(typeof client.getConversationStatus).toBe("function");
      expect(typeof client.updateConversationStatus).toBe("function");
      expect(typeof client.getConversationMessages).toBe("function");
      expect(typeof client.callAgent).toBe("function");
      expect(typeof client.fetchSitePublicConfig).toBe("function");
      expect(typeof client.submitMessageFeedback).toBe("function");
      expect(typeof client.uploadAttachment).toBe("function");
      expect(typeof client.fetchAvailableSlots).toBe("function");
    });
  });

  describe("WidgetProvider & Context Hooks", () => {
    it("should provide config and apiClient through WidgetProvider", () => {
      const customConfig = {
        siteId: "ctx-site",
        backendUrl: "https://ctx.example.com",
        isTestMode: true,
        isOpenDefault: true,
        collectPageContext: true,
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WidgetProvider config={customConfig}>{children}</WidgetProvider>
      );

      const { result } = renderHook(() => useWidgetContext(), { wrapper });

      expect(result.current.config).toEqual(customConfig);
      expect(result.current.apiClient.backendUrl).toBe(
        "https://ctx.example.com",
      );
      expect(result.current.apiClient.siteId).toBe("ctx-site");
    });

    it("useWidgetConfig hook returns resolved configuration", () => {
      const customConfig = {
        siteId: "cfg-site",
        backendUrl: "https://cfg.example.com",
        isTestMode: false,
        isOpenDefault: false,
        collectPageContext: false,
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WidgetProvider config={customConfig}>{children}</WidgetProvider>
      );

      const { result } = renderHook(() => useWidgetConfig(), { wrapper });
      expect(result.current).toEqual(customConfig);
    });

    it("useChatApiClient hook returns pre-bound apiClient", () => {
      const customConfig = {
        siteId: "api-site",
        backendUrl: "https://api-hook.example.com",
        isTestMode: false,
        isOpenDefault: false,
        collectPageContext: true,
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WidgetProvider config={customConfig}>{children}</WidgetProvider>
      );

      const { result } = renderHook(() => useChatApiClient(), { wrapper });
      expect(result.current.backendUrl).toBe("https://api-hook.example.com");
      expect(result.current.siteId).toBe("api-site");
    });

    it("should gracefully fallback to default config when used outside WidgetProvider", () => {
      const { result } = renderHook(() => useWidgetConfig());
      expect(result.current.backendUrl).toBe("http://localhost:3000");
    });
  });
});
