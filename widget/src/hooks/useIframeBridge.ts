import { useEffect, useRef } from "react";

interface UseIframeBridgeOptions {
  isTestMode?: boolean;
  onSendMessage: (text: string) => void;
  onResetConversation: () => void;
  onInitTestConversation?: () => void;
}

/**
 * Custom hook to bridge communication with parent window/iframe via window.postMessage.
 * Handles "EZ_CHAT_SEND_MESSAGE" and "EZ_CHAT_RESET" event protocols.
 */
export function useIframeBridge({
  onSendMessage,
  onResetConversation,
  onInitTestConversation,
  isTestMode = false,
}: UseIframeBridgeOptions) {
  const onSendMessageRef = useRef(onSendMessage);
  const onResetConversationRef = useRef(onResetConversation);
  const onInitTestConversationRef = useRef(onInitTestConversation);

  useEffect(() => {
    onSendMessageRef.current = onSendMessage;
    onResetConversationRef.current = onResetConversation;
    onInitTestConversationRef.current = onInitTestConversation;
  });

  useEffect(() => {
    const handleParentMessage = (event: MessageEvent) => {
      if (event.data?.type === "EZ_CHAT_SEND_MESSAGE" && event.data?.text) {
        onSendMessageRef.current(event.data.text);
      }
      if (event.data?.type === "EZ_CHAT_RESET") {
        onResetConversationRef.current();
        if (isTestMode && onInitTestConversationRef.current) {
          onInitTestConversationRef.current();
        }
      }
    };

    window.addEventListener("message", handleParentMessage);
    return () => window.removeEventListener("message", handleParentMessage);
  }, [isTestMode]);
}
