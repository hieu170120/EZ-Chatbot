import { useCallback, useEffect, useState } from "react";
import { useVisitorChatStore } from "./store";
import { ChatHeader } from "./components/ChatHeader";
import { RegistrationForm } from "./components/RegistrationForm";
import { MessageList } from "./components/MessageList";
import { ChatFooter } from "./components/ChatFooter";
import { ChatLauncher } from "./components/ChatLauncher";
import { ImagePreviewModal } from "./components/ImagePreviewModal";
import { TimeoutWarningBanner } from "./components/TimeoutWarningBanner";
import { ReconnectingBanner } from "./components/ReconnectingBanner";
import { useWidgetConfig, useChatApiClient } from "./context/WidgetContext";
import { useSiteConfig } from "./hooks/useSiteConfig";
import { useInactivityTimer } from "./hooks/useInactivityTimer";
import { useChatSocket } from "./hooks/useChatSocket";
import { useIframeBridge } from "./hooks/useIframeBridge";

function App() {
  const config = useWidgetConfig();
  const apiClient = useChatApiClient();

  const {
    backendUrl: BACKEND_URL,
    siteId: SITE_ID,
    isTestMode,
    isOpenDefault,
    collectPageContext,
  } = config;

  const [isOpen, setIsOpen] = useState(isOpenDefault);

  const { isChatEnabled } = useSiteConfig(BACKEND_URL, SITE_ID);

  const {
    showTimeoutWarning,
    setShowTimeoutWarning,
    countdownSeconds,
    setCountdownSeconds,
    warningMessageText,
    setWarningMessageText,
    resetTimerUi,
    formatCountdown,
  } = useInactivityTimer();

  const {
    conversationId,
    visitorToken,
    visitorName,
    visitorEmail,
    messages,
    isAgentTyping,
    status,
    setStatus,
    clearStore,
    timeoutSettings,
    appearanceSettings,
    useCurrentPageContent,
  } = useVisitorChatStore();

  const shouldCollectPageContext = collectPageContext && useCurrentPageContent;

  const resetConversationUi = useCallback(() => {
    clearStore();
    resetTimerUi();
  }, [clearStore, resetTimerUi]);

  const handleConversationClosed = useCallback(() => {
    setStatus("CLOSED");
    resetTimerUi();
  }, [setStatus, resetTimerUi]);

  const handleConversationWarning = useCallback(
    (seconds: number, message?: string) => {
      setCountdownSeconds(seconds);
      setWarningMessageText(message || "");
      setShowTimeoutWarning(true);
    },
    [setCountdownSeconds, setWarningMessageText, setShowTimeoutWarning],
  );

  const handleConversationTimerReset = useCallback(() => {
    setShowTimeoutWarning(false);
    setCountdownSeconds(0);
    setWarningMessageText("");
  }, [setShowTimeoutWarning, setCountdownSeconds, setWarningMessageText]);

  const handleChatDisabled = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const {
    handlingStatus,
    isBotResponding,
    isCallingAgent,
    isReconnecting,
    emitTyping,
    emitRead,
    startConversation,
    sendMessage,
    callAgent,
    initTestConversation,
    loadMoreMessages,
  } = useChatSocket(
    BACKEND_URL,
    SITE_ID,
    isChatEnabled,
    isOpen,
    handleConversationClosed,
    handleConversationWarning,
    handleConversationTimerReset,
    handleChatDisabled,
    isTestMode,
    shouldCollectPageContext,
  );

  const handleClearChat = useCallback(async () => {
    if (isTestMode) {
      initTestConversation();
      return;
    }
    if (conversationId) {
      try {
        await apiClient.updateConversationStatus(
          conversationId,
          "CLOSED",
          { reason: "CLEARED" },
          visitorToken,
        );
      } catch (e) {
        console.error("Failed to close conversation on clear", e);
      }
    }
    await startConversation({
      name: visitorName || undefined,
      email: visitorEmail || undefined,
    });
    resetTimerUi();
  }, [
    isTestMode,
    initTestConversation,
    conversationId,
    apiClient,
    visitorToken,
    visitorName,
    visitorEmail,
    startConversation,
    resetTimerUi,
  ]);

  useEffect(() => {
    if (isOpen && document.hasFocus()) emitRead();
  }, [isOpen, emitRead]);

  useIframeBridge({
    isTestMode,
    onSendMessage: sendMessage,
    onResetConversation: resetConversationUi,
    onInitTestConversation: initTestConversation,
  });

  if (!isChatEnabled) {
    return null;
  }

  const isPositionLeft =
    appearanceSettings?.chatButtonPosition === "Bottom Left";

  return (
    <div className={`ez-widget-root ${isTestMode ? "is-test-mode" : ""}`}>
      <div className="ez-widget-shell">
        <section
          className={`ez-widget-panel ${isOpen ? "is-open" : ""} ${
            isPositionLeft ? "is-position-left" : ""
          }`}
          aria-hidden={!isOpen}
          style={{
            left: isPositionLeft ? "20px" : "auto",
            right: isPositionLeft ? "auto" : "20px",
          }}
        >
          <ChatHeader
            setIsOpen={setIsOpen}
            handlingStatus={handlingStatus}
            onCallAgent={callAgent}
            isCallingAgent={isCallingAgent}
            onResetConversation={resetConversationUi}
            onClearChat={handleClearChat}
          />
          {!conversationId ? (
            <RegistrationForm
              onStart={startConversation}
              onStartAnonymous={(firstMessage) =>
                startConversation({ name: "", email: "", firstMessage })
              }
              appearanceSettings={appearanceSettings}
              initialValues={{ name: visitorName, email: visitorEmail }}
            />
          ) : (
            <>
              <ReconnectingBanner
                show={isReconnecting && status !== "CLOSED"}
              />
              <TimeoutWarningBanner
                show={showTimeoutWarning}
                warningMessageText={warningMessageText}
                inactivityWarningMessage={
                  timeoutSettings?.inactivityWarningMessage
                }
                countdownSeconds={countdownSeconds}
                formatCountdown={formatCountdown}
              />
              <MessageList
                messages={messages}
                isAgentTyping={isAgentTyping}
                isOpen={isOpen}
                isBotResponding={
                  isBotResponding && handlingStatus === "AI_HANDLING"
                }
                status={status}
                onSendMessage={sendMessage}
                onLoadMore={loadMoreMessages}
              />
              <ChatFooter
                onSendMessage={sendMessage}
                onTyping={emitTyping}
                status={status}
                handlingStatus={handlingStatus}
                isBotResponding={
                  isBotResponding && handlingStatus === "AI_HANDLING"
                }
                onResetConversation={resetConversationUi}
                isReconnecting={isReconnecting}
              />
            </>
          )}
        </section>
        {!isTestMode && <ChatLauncher isOpen={isOpen} setIsOpen={setIsOpen} />}
      </div>
      <ImagePreviewModal />
    </div>
  );
}

export default App;
