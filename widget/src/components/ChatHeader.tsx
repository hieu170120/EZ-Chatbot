import { useState, useEffect } from "react";
import {
  Avatar,
  Button,
  Popover,
  Popconfirm,
  Modal,
  Input,
  message,
} from "antd";
import {
  CloseOutlined,
  CustomerServiceOutlined,
  PauseCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  MoreOutlined,
  ClearOutlined,
  MailOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useVisitorChatStore } from "../store";
import type { HandlingStatus } from "../store";
import { useWidgetConfig, useChatApiClient } from "../context/WidgetContext";

type ChatHeaderProps = {
  setIsOpen: (isOpen: boolean) => void;
  handlingStatus?: HandlingStatus;
  onCallAgent?: () => void;
  isCallingAgent?: boolean;
  onResetConversation?: () => void;
  onClearChat?: () => Promise<void> | void;
};

export function ChatHeader({
  setIsOpen,
  handlingStatus,
  onCallAgent,
  isCallingAgent,
  onResetConversation,
  onClearChat,
}: ChatHeaderProps) {
  const { isTestMode } = useWidgetConfig();
  const apiClient = useChatApiClient();

  const {
    siteName,
    conversationId,
    visitorToken,
    visitorEmail,
    status,
    setStatus,
    addMessage,
    appearanceSettings,
    humanHandoff,
    isAiActive,
    emailTranscript,
    isAgentTyping,
  } = useVisitorChatStore();

  const [isEndChatModalOpen, setIsEndChatModalOpen] = useState(false);
  const [transcriptEmailInput, setTranscriptEmailInput] = useState(
    visitorEmail || "",
  );
  const [isEndingWithoutEmail, setIsEndingWithoutEmail] = useState(false);
  const [isEndingWithEmail, setIsEndingWithEmail] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    if (visitorEmail) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTranscriptEmailInput(visitorEmail);
    }
  }, [visitorEmail]);

  const handleUpdateStatus = async (
    newStatus: "PAUSED" | "CLOSED" | "OPEN",
    reason?: string,
    transcriptEmail?: string,
    setLoading?: (v: boolean) => void,
  ) => {
    if (!conversationId) return;
    const targetConversationId = conversationId;
    try {
      setLoading?.(true);
      // Close UI modals immediately to feel responsive
      setIsEndChatModalOpen(false);
      setPopoverOpen(false);

      await apiClient.updateConversationStatus(
        conversationId,
        newStatus,
        {
          reason,
          transcriptEmail,
        },
        visitorToken,
      );

      if (
        useVisitorChatStore.getState().conversationId !== targetConversationId
      ) {
        return;
      }
      setStatus(newStatus);
      addMessage({
        id: Date.now().toString(),
        role: "system",
        text:
          newStatus === "CLOSED"
            ? transcriptEmail?.trim() &&
              transcriptEmail?.trim() !== "skip_email"
              ? `Chat ended. A transcript will be sent to ${transcriptEmail.trim()}.`
              : "Chat ended"
            : newStatus === "PAUSED"
              ? "Chat paused"
              : "Chat resumed",
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Failed to update status", e);
      message.error(
        `Server error: Failed to ${
          newStatus === "CLOSED"
            ? "end"
            : newStatus === "PAUSED"
              ? "pause"
              : "resume"
        } chat. Please try again.`,
      );
      addMessage({
        id: Date.now().toString(),
        role: "system",
        text: "Failed to update status",
        createdAt: new Date().toISOString(),
      });
    } finally {
      setLoading?.(false);
    }
  };

  const handleClearChat = async () => {
    setPopoverOpen(false);
    if (onClearChat) {
      await onClearChat();
      return;
    }
    if (conversationId) {
      try {
        await apiClient.updateConversationStatus(
          conversationId,
          "CLOSED",
          {
            reason: "CLEARED",
          },
          visitorToken,
        );
      } catch (e) {
        console.error("Failed to close conversation on clear", e);
        message.error("Server error: Unable to clear chat. Please try again.");
        return;
      }
    }
    if (onResetConversation) {
      onResetConversation();
    }
  };

  const showCallAgent =
    conversationId &&
    status !== "CLOSED" &&
    handlingStatus !== "AGENT_HANDLING" &&
    humanHandoff === true &&
    isAiActive === true;
  const isWaitingForAgent = handlingStatus === "WAITING_FOR_AGENT";

  const moreMenuContent = (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {showCallAgent && (
        <Button
          type="text"
          icon={<CustomerServiceOutlined />}
          onClick={() => {
            setPopoverOpen(false);
            onCallAgent?.();
          }}
          loading={isCallingAgent}
          disabled={isWaitingForAgent || isCallingAgent}
          style={{ justifyContent: "flex-start" }}
        >
          {isWaitingForAgent ? "Waiting for agent..." : "Talk to human agent"}
        </Button>
      )}
      <Button
        type="text"
        icon={
          status === "PAUSED" ? <PlayCircleOutlined /> : <PauseCircleOutlined />
        }
        onClick={() => {
          setPopoverOpen(false);
          handleUpdateStatus(status === "PAUSED" ? "OPEN" : "PAUSED");
        }}
        style={{ justifyContent: "flex-start" }}
      >
        {status === "PAUSED" ? "Resume Chat" : "Pause Chat"}
      </Button>
      <Popconfirm
        title="Clear conversation?"
        description={
          isWaitingForAgent || handlingStatus === "AGENT_HANDLING"
            ? "⚠️ Connected with agent. End session & clear chat?"
            : "Clear this chat and start fresh?"
        }
        onConfirm={handleClearChat}
        okText="Yes"
        cancelText="No"
        okButtonProps={{ danger: true, size: "small" }}
        cancelButtonProps={{ size: "small" }}
        placement="bottomRight"
        overlayStyle={{ maxWidth: "230px" }}
        overlayInnerStyle={{ maxWidth: "230px" }}
        getPopupContainer={(triggerNode) =>
          (triggerNode.closest(".ez-widget-panel") as HTMLElement) ||
          document.body
        }
      >
        <Button
          type="text"
          danger
          icon={<ClearOutlined />}
          style={{ justifyContent: "flex-start" }}
        >
          Clear Chat
        </Button>
      </Popconfirm>

      {emailTranscript ? (
        <Button
          type="text"
          danger
          icon={<CloseCircleOutlined />}
          onClick={() => {
            setPopoverOpen(false);
            setIsEndChatModalOpen(true);
          }}
          style={{ justifyContent: "flex-start" }}
        >
          End Chat
        </Button>
      ) : (
        <Popconfirm
          title="End chat"
          description="Are you sure you want to end this chat?"
          onConfirm={() => handleUpdateStatus("CLOSED")}
          okText="Yes, end chat"
          cancelText="No"
          okButtonProps={{ danger: true, size: "small" }}
          cancelButtonProps={{ size: "small" }}
          placement="bottomRight"
          overlayStyle={{ maxWidth: "230px" }}
          overlayInnerStyle={{ maxWidth: "230px" }}
          getPopupContainer={(triggerNode) =>
            (triggerNode.closest(".ez-widget-panel") as HTMLElement) ||
            document.body
          }
        >
          <Button
            type="text"
            danger
            icon={<CloseCircleOutlined />}
            style={{ justifyContent: "flex-start" }}
          >
            End Chat
          </Button>
        </Popconfirm>
      )}
    </div>
  );

  const hasPrimaryColor = Boolean(appearanceSettings?.primaryColor);

  return (
    <header
      className={`ez-widget-header ${
        !hasPrimaryColor ? "ez-widget-header-default" : ""
      }`}
      style={{
        background: appearanceSettings?.primaryColor
          ? `linear-gradient(135deg, ${appearanceSettings.primaryColor} 0%, ${appearanceSettings.primaryColor}dd 100%)`
          : undefined,
      }}
    >
      <div className="ez-widget-header-gloss" />
      <div className="ez-widget-title">
        {appearanceSettings?.showAvatar !== false && (
          <div className="ez-widget-header-avatar-wrap">
            <Avatar
              size={36}
              src={appearanceSettings?.botAvatar}
              icon={
                !appearanceSettings?.botAvatar && (
                  <CustomerServiceOutlined style={{ fontSize: 20 }} />
                )
              }
              className="ez-widget-header-avatar"
              style={{
                backgroundColor: appearanceSettings?.botAvatar
                  ? "transparent"
                  : hasPrimaryColor
                    ? "rgba(255, 255, 255, 0.2)"
                    : "#6366f1",
              }}
            />
            <span
              className={`ez-widget-status-badge ${
                conversationId && handlingStatus === "WAITING_FOR_AGENT"
                  ? "is-waiting"
                  : "is-online"
              }`}
            >
              <span className="ez-widget-status-dot-core" />
              <span className="ez-widget-status-dot-pulse" />
            </span>
          </div>
        )}
        <div className="ez-widget-header-text">
          <span
            className="ez-widget-header-title"
            style={{
              color: hasPrimaryColor ? "#ffffff" : "#0f172a",
            }}
          >
            {appearanceSettings?.chatWindowTitle || siteName || "Support Chat"}
          </span>
          <div
            className="ez-widget-header-subtitle"
            style={{
              color: hasPrimaryColor ? "rgba(255, 255, 255, 0.88)" : "#64748b",
            }}
          >
            {isAgentTyping ? (
              <span className="ez-widget-header-typing">
                Agent is typing
                <span className="ez-widget-header-typing-dots">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </span>
            ) : conversationId && handlingStatus === "AGENT_HANDLING" ? (
              <span className="ez-widget-status-pill">Agent Connected</span>
            ) : conversationId && handlingStatus === "WAITING_FOR_AGENT" ? (
              <span className="ez-widget-status-pill">Connecting agent...</span>
            ) : (
              <span className="ez-widget-status-pill">
                Typically replies instantly
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="ez-widget-header-actions">
        {conversationId && status !== "CLOSED" && (
          <Popover
            content={moreMenuContent}
            trigger="click"
            placement="bottomRight"
            open={popoverOpen}
            onOpenChange={setPopoverOpen}
            getPopupContainer={(triggerNode) =>
              (triggerNode.closest(".ez-widget-panel") as HTMLElement) ||
              document.body
            }
          >
            <Button
              type="text"
              shape="circle"
              icon={<MoreOutlined style={{ fontSize: "18px" }} />}
              aria-label="More options"
              className="ez-widget-header-btn ez-widget-header-more-btn"
              style={{
                color: hasPrimaryColor ? "#ffffff" : "#475569",
              }}
            />
          </Popover>
        )}
        {!isTestMode && (
          <Button
            type="text"
            shape="circle"
            icon={<CloseOutlined style={{ fontSize: "16px" }} />}
            aria-label="Close chat"
            className="ez-widget-header-btn ez-widget-header-close-btn"
            onClick={() => setIsOpen(false)}
            style={{
              color: hasPrimaryColor ? "#ffffff" : "#475569",
            }}
          />
        )}
      </div>

      <Modal
        open={isEndChatModalOpen}
        onCancel={() => setIsEndChatModalOpen(false)}
        zIndex={2147483647}
        centered
        className="ez-end-chat-modal"
        wrapClassName="ez-end-chat-modal-wrap"
        width={400}
        closable={false}
        footer={null}
      >
        <div className="ez-end-chat-content">
          <div className="ez-end-chat-icon-badge">
            <MailOutlined style={{ fontSize: 24, color: "#6366f1" }} />
          </div>

          <h3 className="ez-end-chat-title">End Chat Session</h3>
          <p className="ez-end-chat-desc">
            Would you like to receive a copy of this chat transcript via email?
          </p>

          <div className="ez-end-chat-input-wrapper">
            <Input
              size="large"
              prefix={
                <MailOutlined style={{ color: "#9ca3af", marginRight: 6 }} />
              }
              placeholder="Enter your email address"
              value={transcriptEmailInput}
              onChange={(e) => setTranscriptEmailInput(e.target.value)}
              className="ez-end-chat-input"
              allowClear
            />
            {transcriptEmailInput.trim() &&
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                transcriptEmailInput.trim(),
              ) && (
                <span className="ez-end-chat-error-hint">
                  Please enter a valid email address
                </span>
              )}
          </div>

          <div className="ez-end-chat-actions">
            <button
              type="button"
              className={`ez-btn-send-transcript ${
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(transcriptEmailInput.trim())
                  ? "is-disabled"
                  : ""
              }`}
              disabled={
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                  transcriptEmailInput.trim(),
                ) ||
                isEndingWithEmail ||
                isEndingWithoutEmail
              }
              onClick={() =>
                handleUpdateStatus(
                  "CLOSED",
                  undefined,
                  transcriptEmailInput.trim(),
                  setIsEndingWithEmail,
                )
              }
            >
              <SendOutlined style={{ fontSize: 13, marginRight: 6 }} />
              {isEndingWithEmail
                ? "Sending & Ending..."
                : "Send Transcript & End"}
            </button>

            <div className="ez-end-chat-secondary-actions">
              <button
                type="button"
                className="ez-btn-end-without"
                disabled={isEndingWithEmail || isEndingWithoutEmail}
                onClick={() =>
                  handleUpdateStatus(
                    "CLOSED",
                    undefined,
                    "skip_email",
                    setIsEndingWithoutEmail,
                  )
                }
              >
                {isEndingWithoutEmail ? "Ending..." : "End Without Email"}
              </button>

              <button
                type="button"
                className="ez-btn-cancel-modal"
                disabled={isEndingWithEmail || isEndingWithoutEmail}
                onClick={() => setIsEndChatModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </header>
  );
}
