import { useState } from "react";
import {
  CheckOutlined,
  CopyOutlined,
  ScheduleOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { BookingServiceItem } from "../../store";

export type SlotAssignmentItem = {
  slotIndex: number;
  timeSlot: string;
  date?: string;
  resourceName?: string;
  serviceId: string;
  serviceName: string;
};

export type SlotInfo = {
  timeSlot: string;
  date?: string;
  resourceId?: string;
  resourceName?: string;
};

interface InlineSlotServiceAssignerProps {
  slots: SlotInfo[];
  availableServices: BookingServiceItem[];
  selectedServices?: BookingServiceItem[];
  locale?: string;
  primaryColor?: string;
  disabled?: boolean;
  onConfirm: (assignments: SlotAssignmentItem[]) => void;
}

export function InlineSlotServiceAssigner({
  slots = [],
  availableServices = [],
  selectedServices = [],
  locale = "vi",
  primaryColor = "#1677ff",
  disabled = false,
  onConfirm,
}: InlineSlotServiceAssignerProps) {
  const { t } = useTranslation("booking", { lng: locale });

  // Filter the list of services to choose from
  const selectableServices =
    selectedServices && selectedServices.length > 0
      ? selectedServices
      : availableServices;

  // Initialize assignments: slot 0 gets service 0, slot 1 gets service 1, remaining gets service 0
  const [assignments, setAssignments] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    slots.forEach((_, idx) => {
      if (selectableServices[idx]) {
        initial[idx] = selectableServices[idx].id;
      } else if (selectableServices[0]) {
        initial[idx] = selectableServices[0].id;
      } else {
        initial[idx] = "";
      }
    });
    return initial;
  });

  const [activeSlotIdx, setActiveSlotIdx] = useState(0);

  const handleSelectServiceForSlot = (slotIdx: number, serviceId: string) => {
    setAssignments((prev) => ({
      ...prev,
      [slotIdx]: serviceId,
    }));
  };

  const handleApplyToAll = (sourceSlotIdx: number) => {
    const serviceIdToApply = assignments[sourceSlotIdx];
    if (!serviceIdToApply) return;
    setAssignments(() => {
      const updated: Record<number, string> = {};
      slots.forEach((_, idx) => {
        updated[idx] = serviceIdToApply;
      });
      return updated;
    });
  };

  const handleConfirm = () => {
    if (disabled || slots.length === 0) return;
    const finalAssignments: SlotAssignmentItem[] = slots.map((s, idx) => {
      const sId = assignments[idx] || selectableServices[0]?.id || "";
      const sObj =
        selectableServices.find((item) => item.id === sId) ||
        availableServices.find((item) => item.id === sId);
      return {
        slotIndex: idx,
        timeSlot: s.timeSlot,
        date: s.date,
        resourceName: s.resourceName,
        serviceId: sId,
        serviceName: sObj?.name || sId,
      };
    });
    onConfirm(finalAssignments);
  };

  const currentSlot = slots[activeSlotIdx] || slots[0];
  const currentAssignedServiceId = assignments[activeSlotIdx];

  if (!slots || slots.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        marginTop: "10px",
        marginBottom: "10px",
        padding: "14px",
        background: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
          paddingBottom: "8px",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <ScheduleOutlined style={{ color: primaryColor, fontSize: "16px" }} />
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#1e293b",
          }}
        >
          {t("summary.slotSchedule") || "Phân bổ dịch vụ theo khung giờ"} (
          {slots.length} {t("summary.slot") || "khung giờ"})
        </span>
      </div>

      {/* Horizontal Slot Pill Switcher */}
      {slots.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            paddingBottom: "8px",
            marginBottom: "12px",
            scrollbarWidth: "none",
          }}
        >
          {slots.map((slot, idx) => {
            const isActive = activeSlotIdx === idx;
            const assignedSId = assignments[idx];
            const assignedS = selectableServices.find(
              (s) => s.id === assignedSId,
            );
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlotIdx(idx)}
                disabled={disabled}
                style={{
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: isActive
                    ? `1.5px solid ${primaryColor}`
                    : "1px solid #cbd5e1",
                  background: isActive ? `${primaryColor}15` : "#f8fafc",
                  cursor: disabled ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? primaryColor : "#334155",
                  }}
                >
                  #{idx + 1}: {slot.timeSlot}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: isActive ? primaryColor : "#64748b",
                    marginTop: "2px",
                    maxWidth: "70px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {assignedS?.name || "--"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Active Slot Configuration Card */}
      {currentSlot && (
        <div
          style={{
            background: "#f8fafc",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "6px",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#1e293b",
              }}
            >
              Khung {activeSlotIdx + 1}: {currentSlot.timeSlot}
              {currentSlot.resourceName ? ` (${currentSlot.resourceName})` : ""}
            </span>
            {slots.length > 1 && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleApplyToAll(activeSlotIdx)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: 500,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  border: `1px solid ${primaryColor}`,
                  background: "#ffffff",
                  color: primaryColor,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                <CopyOutlined style={{ fontSize: "11px" }} />
                Áp dụng tất cả
              </button>
            )}
          </div>

          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#64748b",
                marginBottom: "6px",
              }}
            >
              Chọn dịch vụ:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {selectableServices.map((service) => {
                const isSelected = currentAssignedServiceId === service.id;
                return (
                  <button
                    key={service.id}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      handleSelectServiceForSlot(activeSlotIdx, service.id)
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "5px 10px",
                      borderRadius: "16px",
                      border: isSelected
                        ? `1.5px solid ${primaryColor}`
                        : "1px solid #cbd5e1",
                      background: isSelected ? primaryColor : "#ffffff",
                      color: isSelected ? "#ffffff" : "#334155",
                      fontWeight: isSelected ? 600 : 400,
                      fontSize: "12px",
                      cursor: disabled ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isSelected && (
                      <CheckOutlined
                        style={{ fontSize: "11px", color: "#ffffff" }}
                      />
                    )}
                    <span>{service.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleConfirm}
        style={{
          width: "100%",
          borderRadius: "8px",
          height: "38px",
          fontWeight: 600,
          fontSize: "13px",
          background: primaryColor,
          borderColor: primaryColor,
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: "0 2px 6px rgba(22, 119, 255, 0.25)",
          border: "none",
          transition: "opacity 0.2s ease",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <CheckOutlined style={{ fontSize: "13px", color: "#ffffff" }} />
        <span style={{ color: "#ffffff", fontWeight: 600 }}>
          {locale === "vi"
            ? "Xác nhận phân bổ dịch vụ"
            : locale === "ja"
              ? "サービス割り当てを確定"
              : "Confirm Service Breakdown"}
        </span>
      </button>
    </div>
  );
}
