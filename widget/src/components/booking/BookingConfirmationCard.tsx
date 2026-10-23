import { useMemo } from "react";
import { CheckCircleFilled } from "@ant-design/icons";
import { Button } from "antd";
import { useTranslation } from "react-i18next";
import { useVisitorChatStore } from "../../store";
import {
  calculateSlotEndTime,
  formatSlotRanges,
} from "../../utils/booking-time.utils";

interface BookingResult {
  locale?: string;
  bookingCode?: string;
  allBookingCodes?: string[];
  status?: string;
  customerName?: string;
  customerEmail?: string;
  phone?: string;
  date?: string;
  timeSlot?: string;
  endTimeSlot?: string;
  resourceName?: string;
  serviceName?: string;
  serviceNames?: string[];
  createdAt?: string;
  slots?: Array<{
    date?: string;
    timeSlot?: string;
    resourceId?: string;
    serviceId?: string;
    serviceName?: string;
    staffName?: string;
  }>;
}

interface BookingConfirmationCardProps {
  result: BookingResult;
  primaryColor?: string;
  cancelled?: boolean;
  onCancel?: () => void;
}

export function BookingConfirmationCard({
  result,
  cancelled,
  onCancel,
}: BookingConfirmationCardProps) {
  const { t } = useTranslation("booking", { lng: result.locale || "en" });
  const slotDuration = useVisitorChatStore((s) => s.bookingHours?.slotDuration);

  const text = {
    title: t("confirmation.title"),
    code: t("field.code"),
    service: t("field.service"),
    staff: t("field.staff"),
    name: t("field.name"),
    phone: t("field.phone"),
    email: t("field.email"),
    date: t("field.date"),
    time: t("field.time"),
    empty: t("field.empty"),
    cancel: t("action.cancelBooking"),
    cancelled: t("confirmation.cancelled"),
  };

  const formattedTime = useMemo(() => {
    if (result.slots && result.slots.length > 0) {
      const ranges = formatSlotRanges(result.slots, slotDuration);
      if (ranges) return ranges;
    }
    if (result.endTimeSlot) {
      return `${result.timeSlot} - ${result.endTimeSlot}`;
    }
    if (result.timeSlot) {
      const end = calculateSlotEndTime(result.timeSlot, slotDuration);
      return `${result.timeSlot} - ${end}`;
    }
    return text.empty;
  }, [
    result.slots,
    result.timeSlot,
    result.endTimeSlot,
    slotDuration,
    text.empty,
  ]);

  const formattedDate = useMemo(() => {
    if (result.slots && result.slots.length > 0) {
      const dates = Array.from(
        new Set(
          result.slots
            .map((s) => s.date)
            .filter((d): d is string => Boolean(d && d.trim())),
        ),
      );
      if (dates.length > 0) return dates.join(", ");
    }
    return result.date || text.empty;
  }, [result.slots, result.date, text.empty]);

  return (
    <div
      style={{
        marginTop: "12px",
        padding: "16px",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        background: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        textAlign: "center",
      }}
    >
      <CheckCircleFilled
        style={{
          fontSize: "32px",
          color: cancelled ? "#dc2626" : "#52c41a",
          marginBottom: "12px",
        }}
      />
      <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", color: "#111827" }}>
        {cancelled ? text.cancelled : text.title}
      </h4>
      <div
        style={{
          textAlign: "left",
          fontSize: "13px",
          color: "#4b5563",
          background: "#f9fafb",
          padding: "12px",
          borderRadius: "8px",
        }}
      >
        <p style={{ margin: "0 0 8px 0" }}>
          <strong>{text.code}:</strong>{" "}
          {result.allBookingCodes?.length
            ? result.allBookingCodes.join(", ")
            : result.bookingCode || text.empty}
        </p>
        {result.serviceNames?.length || result.serviceName ? (
          <p style={{ margin: "0 0 8px 0" }}>
            <strong>{text.service}:</strong>{" "}
            {result.serviceNames?.length
              ? result.serviceNames.join(", ")
              : result.serviceName}
          </p>
        ) : null}
        <p style={{ margin: "0 0 8px 0" }}>
          <strong>{text.staff}:</strong> {result.resourceName || text.empty}
        </p>
        <p style={{ margin: "0 0 8px 0" }}>
          <strong>{text.name}:</strong> {result.customerName || text.empty}
        </p>
        <p style={{ margin: "0 0 8px 0" }}>
          <strong>{text.phone}:</strong> {result.phone || text.empty}
        </p>
        <p style={{ margin: "0 0 8px 0" }}>
          <strong>{text.email}:</strong> {result.customerEmail || text.empty}
        </p>
        <p style={{ margin: "0 0 8px 0" }}>
          <strong>{text.date}:</strong> {formattedDate}
        </p>
        <p style={{ margin: 0 }}>
          <strong>{text.time}:</strong> {formattedTime}
        </p>
      </div>
      {onCancel && (
        <Button
          className="ez-booking-danger-button"
          danger={!cancelled}
          disabled={cancelled}
          onClick={onCancel}
          style={{ marginTop: "12px", width: "100%" }}
        >
          {cancelled ? text.cancelled : text.cancel}
        </Button>
      )}
    </div>
  );
}
