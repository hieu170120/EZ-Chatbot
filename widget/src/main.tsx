import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import { StyleProvider } from "@ant-design/cssinjs";
import App from "./App";
import { resolveWidgetConfig } from "./config/widget-config";
import { WidgetProvider } from "./context/WidgetContext";
import antdResetCss from "antd/dist/reset.css?raw";
import appCss from "./App.css?raw";
import indexCss from "./index.css?raw";
import "./i18n";

// Resolve and validate configuration once at bootstrap
const config = resolveWidgetConfig();

// Maintain backwards compatibility for external window inspection
if (typeof window !== "undefined") {
  window.EzChatConfig = config;
}

const mountNode = (() => {
  const existing = document.getElementById("ez-chat-widget-host");
  if (existing) {
    existing.style.width = "100%";
    existing.style.height = "100%";
    existing.style.display = "block";
    return existing;
  }

  const node = document.createElement("div");
  node.id = "ez-chat-widget-host";
  if (!config.isTestMode) {
    node.style.position = "fixed";
    node.style.inset = "0";
    node.style.width = "100%";
    node.style.height = "100%";
    node.style.pointerEvents = "none";
    node.style.zIndex = "2147483647";
    node.style.display = "block";
  } else {
    node.style.width = "100%";
    node.style.height = "100%";
    node.style.display = "block";
  }
  (document.body ?? document.documentElement).appendChild(node);
  return node;
})();

// 1. Create or get Shadow Root
let shadowRoot = mountNode.shadowRoot;
if (!shadowRoot) {
  shadowRoot = mountNode.attachShadow({ mode: "open" });
}

// 2. Inject Static CSS into Shadow DOM
const styleId = "ez-chat-widget-styles";
if (!shadowRoot.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = [antdResetCss, indexCss, appCss].join("\n");
  shadowRoot.appendChild(style);
}

// 3. Create a React mount point inside the Shadow DOM
const reactRootId = "ez-chat-widget-root";
let reactMountNode = shadowRoot.getElementById(reactRootId);
if (!reactMountNode) {
  reactMountNode = document.createElement("div");
  reactMountNode.id = reactRootId;
  reactMountNode.style.width = "100%";
  reactMountNode.style.height = "100%";
  reactMountNode.style.display = "block";
  shadowRoot.appendChild(reactMountNode);
} else {
  reactMountNode.style.width = "100%";
  reactMountNode.style.height = "100%";
}

createRoot(reactMountNode!).render(
  <StrictMode>
    <StyleProvider container={shadowRoot}>
      <ConfigProvider getPopupContainer={() => reactMountNode!}>
        <WidgetProvider config={config}>
          <App />
        </WidgetProvider>
      </ConfigProvider>
    </StyleProvider>
  </StrictMode>,
);
