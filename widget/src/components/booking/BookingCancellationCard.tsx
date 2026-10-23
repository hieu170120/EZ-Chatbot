import { Button } from "antd";
import type { BookingCancellationPayload } from "../../store";
import { useTranslation } from "react-i18next";

interface BookingCancellationCardProps {
  payload: BookingCancellationPayload;
  onKeep: () => void;
  onConfirm: () => void;
  disabled?: boolean;
}

export function BookingCancellationCard({
  payload,
  onKeep,
  onConfirm,
  disabled,
}: BookingCancellationCardProps) {
  const { t } = useTranslation("booking", { lng: payload.locale || "en" });
  const text = {
    title: t("cancellation.title"),
    message: t("cancellation.message"),
    code: t("field.code"),
    service: t("field.service"),
    staff: t("field.staff"),
    name: t("field.name"),
    phone: t("field.phone"),
    date: t("field.date"),
    time: t("field.time"),
    empty: t("field.empty"),
    keep: t("cancellation.keep"),
    confirm: t("action.cancelBooking"),
  };

  return (
    <div
      style={{
        marginTop: "12px",
        padding: "16px",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        background: "#fff",
      }}
    >
      <h4 style={{ margin: "0 0 8px", fontSize: "16px", color: "#111827" }}>
        {text.title}
      </h4>
      <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#4b5563" }}>
        {text.message}
      </p>
      <div
        style={{
          marginBottom: "16px",
          padding: "12px",
          borderRadius: "8px",
          background: "#f9fafb",
          fontSize: "13px",
          color: "#4b5563",
        }}
      >
        <p style={{ margin: "0 0 8px" }}>
          <strong>{text.code}:</strong> {payload.bookingCode}
        </p>
        <p style={{ margin: "0 0 8px" }}>
          <strong>{text.service}:</strong> {payload.serviceName || text.empty}
        </p>
        <p style={{ margin: "0 0 8px" }}>
          <strong>{text.staff}:</strong> {payload.resourceName || text.empty}
        </p>
        <p style={{ margin: "0 0 8px" }}>
          <strong>{text.name}:</strong> {payload.customerName || text.empty}
        </p>
        <p style={{ margin: "0 0 8px" }}>
          <strong>{text.phone}:</strong> {payload.phone || text.empty}
        </p>
        <p style={{ margin: "0 0 8px" }}>
          <strong>{text.date}:</strong> {payload.date || text.empty}
        </p>
        <p style={{ margin: 0 }}>
          <strong>{text.time}:</strong> {payload.timeSlot || text.empty}
        </p>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <Button block disabled={disabled} onClick={onKeep}>
          {text.keep}
        </Button>
        <Button
          className="ez-booking-danger-button"
          block
          danger
          type="primary"
          disabled={disabled}
          onClick={onConfirm}
        >
          {text.confirm}
        </Button>
      </div>
    </div>
  );
}
