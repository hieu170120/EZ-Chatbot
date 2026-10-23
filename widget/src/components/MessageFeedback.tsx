import { useState } from "react";
import {
  LikeOutlined,
  LikeFilled,
  DislikeOutlined,
  DislikeFilled,
} from "@ant-design/icons";
import { message } from "antd";
import { useVisitorChatStore } from "../store";
import type { FeedbackRating } from "../store";

interface MessageFeedbackProps {
  messageId: string;
  feedbackRating?: FeedbackRating;
  isBotResponding?: boolean;
}

export function MessageFeedback({
  messageId,
  feedbackRating,
  isBotResponding = false,
}: MessageFeedbackProps) {
  const submitMessageFeedback = useVisitorChatStore(
    (state) => state.submitMessageFeedback,
  );
  const appearanceSettings = useVisitorChatStore(
    (state) => state.appearanceSettings,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const primaryColor = appearanceSettings?.primaryColor || "#6366f1";

  const handleVote = async (rating: FeedbackRating) => {
    if (isBotResponding || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await submitMessageFeedback(messageId, rating);
    } catch {
      message.error("Unable to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isHelpful = feedbackRating === "HELPFUL";
  const isUnhelpful = feedbackRating === "UNHELPFUL";
  const isDisabled = isBotResponding || isSubmitting;

  return (
    <div
      className="ez-message-feedback"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        marginTop: "4px",
        padding: "2px 4px",
        borderRadius: "6px",
        fontSize: "12px",
        userSelect: "none",
      }}
      aria-label="Message feedback rating"
    >
      <button
        type="button"
        onClick={() => void handleVote("HELPFUL")}
        disabled={isDisabled}
        title="Helpful"
        aria-label="Rate as helpful"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "3px 6px",
          borderRadius: "4px",
          border: isHelpful
            ? `1px solid ${primaryColor}`
            : "1px solid transparent",
          background: isHelpful ? `${primaryColor}18` : "transparent",
          color: isHelpful ? primaryColor : "#9ca3af",
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isDisabled ? 0.6 : 1,
          transition: "all 0.15s ease",
          fontSize: "13px",
          lineHeight: 1,
        }}
      >
        {isHelpful ? <LikeFilled /> : <LikeOutlined />}
      </button>

      <button
        type="button"
        onClick={() => void handleVote("UNHELPFUL")}
        disabled={isDisabled}
        title="Not helpful"
        aria-label="Rate as not helpful"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "3px 6px",
          borderRadius: "4px",
          border: isUnhelpful ? "1px solid #ef4444" : "1px solid transparent",
          background: isUnhelpful ? "rgba(239, 68, 68, 0.1)" : "transparent",
          color: isUnhelpful ? "#ef4444" : "#9ca3af",
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isDisabled ? 0.6 : 1,
          transition: "all 0.15s ease",
          fontSize: "13px",
          lineHeight: 1,
        }}
      >
        {isUnhelpful ? <DislikeFilled /> : <DislikeOutlined />}
      </button>
    </div>
  );
}
