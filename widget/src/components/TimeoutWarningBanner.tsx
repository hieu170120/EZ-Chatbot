import React from "react";

interface TimeoutWarningBannerProps {
  show: boolean;
  warningMessageText: string | null;
  inactivityWarningMessage?: string;
  countdownSeconds: number;
  formatCountdown: (seconds: number) => string;
}

export const TimeoutWarningBanner: React.FC<TimeoutWarningBannerProps> = ({
  show,
  warningMessageText,
  inactivityWarningMessage,
  countdownSeconds,
  formatCountdown,
}) => {
  if (!show) return null;

  const rawMessage =
    warningMessageText || inactivityWarningMessage || "Are you still there?";

  const hasMinutesPlaceholder = rawMessage.includes("{minutes}");

  return (
    <div
      style={{
        padding: "8px 16px",
        backgroundColor: "#fffbe6",
        borderBottom: "1px solid #ffe58f",
        color: "#d48806",
        fontSize: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span>
        {hasMinutesPlaceholder ? (
          <>
            {rawMessage.split("{minutes}").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <strong style={{ margin: "0 4px" }}>
                    {formatCountdown(countdownSeconds)}
                  </strong>
                )}
              </span>
            ))}
          </>
        ) : (
          rawMessage
        )}
      </span>
      {!hasMinutesPlaceholder && (
        <strong style={{ marginLeft: "8px" }}>
          {formatCountdown(countdownSeconds)}
        </strong>
      )}
    </div>
  );
};
