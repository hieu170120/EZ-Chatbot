import { useEffect, useState } from "react";

export function useInactivityTimer() {
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [warningMessageText, setWarningMessageText] = useState<string | null>(
    null,
  );

  // Visual countdown ticker decrementing every second when warning is active
  useEffect(() => {
    if (!showTimeoutWarning || countdownSeconds <= 0) return;

    const intervalId = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [showTimeoutWarning, countdownSeconds]);

  const resetTimerUi = () => {
    setShowTimeoutWarning(false);
    setCountdownSeconds(0);
    setWarningMessageText(null);
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return {
    showTimeoutWarning,
    setShowTimeoutWarning,
    countdownSeconds,
    setCountdownSeconds,
    warningMessageText,
    setWarningMessageText,
    resetTimerUi,
    formatCountdown,
  };
}
