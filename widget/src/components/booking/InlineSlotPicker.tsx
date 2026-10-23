import { useState } from "react";
import { Button } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useVisitorChatStore } from "../../store";

interface AvailableResource {
  resourceId: string;
  resourceName: string;
}

interface AvailableSlot {
  slotId?: string;
  date: string;
  timeSlot: string;
  resourceId?: string;
  resourceName?: string;
  availableResources?: AvailableResource[];
  available: boolean;
}

interface InlineSlotPickerProps {
  slots: AvailableSlot[];
  onSelectSlot: (
    slot: AvailableSlot,
    resourceId?: string,
    resourceName?: string,
  ) => void;
  onSelectMultipleSlots?: (
    slots: AvailableSlot[],
    resourceId?: string,
    resourceName?: string,
  ) => void;
  onCancel?: () => void;
  primaryColor?: string;
  disabled?: boolean;
  locale?: string;
  bookingType?: "single" | "multiple" | null;
  labels?: {
    availableSlots?: string;
    showMore?: string;
    noSlots?: string;
    clear?: string;
  };
}

type SlotChoice = {
  slot: AvailableSlot;
  key: string;
  resourceId?: string;
  resourceName?: string;
};

export function InlineSlotPicker({
  slots,
  onSelectSlot,
  onSelectMultipleSlots,
  onCancel,
  primaryColor = "#1890ff",
  disabled,
  locale = "en",
  bookingType,
  labels,
}: InlineSlotPickerProps) {
  const { t } = useTranslation("booking", { lng: locale });
  const [visibleCount, setVisibleCount] = useState(12);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const partySize = useVisitorChatStore((state) => state.partySize);
  const isGroupBooking =
    bookingType === "multiple" && !!partySize && partySize > 1;

  const selectedBookingServiceIds = useVisitorChatStore(
    (state) => state.selectedBookingServiceIds,
  );
  const targetSlotCount =
    bookingType === "single"
      ? selectedBookingServiceIds.length > 0
        ? selectedBookingServiceIds.length
        : 1
      : isGroupBooking
        ? (partySize ?? 1)
        : 1;
  const isMultiSelectionMode =
    targetSlotCount > 1 || (!isGroupBooking && bookingType === "multiple");

  const hasMultipleDates =
    new Set((slots || []).map((s) => s.date).filter(Boolean)).size > 1;

  const choices: SlotChoice[] = (slots || [])
    .filter((slot) => slot.available)
    .flatMap((slot, index) => {
      const datePrefix = slot.date ? `${slot.date}-` : "";
      if (slot.resourceId) {
        return [
          {
            slot,
            resourceId: slot.resourceId,
            resourceName: slot.resourceName,
            key: `${datePrefix}${slot.slotId || slot.timeSlot}-${slot.resourceId}-${index}`,
          },
        ];
      }

      if (slot.availableResources?.length) {
        return slot.availableResources.map((resource, resourceIndex) => ({
          slot,
          resourceId: resource.resourceId,
          resourceName: resource.resourceName,
          key: `${datePrefix}${slot.slotId || slot.timeSlot}-${resource.resourceId}-${resourceIndex}`,
        }));
      }

      return [
        {
          slot,
          key: `${datePrefix}${slot.slotId || slot.timeSlot}-${index}`,
        },
      ];
    });

  const visibleChoices = choices.slice(0, visibleCount);

  if (choices.length === 0) {
    return (
      <div
        style={{
          padding: "12px",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          background: "#fff",
          marginTop: "8px",
        }}
      >
        <p style={{ margin: 0, color: "#6b7280" }}>
          {labels?.noSlots || t("slots.empty")}
        </p>
      </div>
    );
  }

  const handleToggleSlot = (choice: SlotChoice) => {
    if (disabled) return;
    if (!isMultiSelectionMode) {
      onSelectSlot(
        choice.slot,
        choice.resourceId || choice.slot.resourceId,
        choice.resourceName || choice.slot.resourceName,
      );
      return;
    }
    setSelectedKeys((prev) => {
      if (prev.includes(choice.key)) {
        return prev.filter((k) => k !== choice.key);
      }
      if (bookingType === "single") {
        const existingSameTimeKey = prev.find((k) => {
          const c = choices.find((item) => item.key === k);
          return (
            c &&
            c.slot.date === choice.slot.date &&
            c.slot.timeSlot === choice.slot.timeSlot
          );
        });
        if (existingSameTimeKey) {
          const filtered = prev.filter((k) => k !== existingSameTimeKey);
          if (targetSlotCount > 1 && filtered.length >= targetSlotCount) {
            return [...filtered.slice(1), choice.key];
          }
          return [...filtered, choice.key];
        }
      }
      if (targetSlotCount > 1 && prev.length >= targetSlotCount) {
        return [...prev.slice(1), choice.key];
      }
      return [...prev, choice.key];
    });
  };

  const selectedChoices = choices
    .filter((c) => selectedKeys.includes(c.key))
    .sort((a, b) => {
      const dateA = a.slot.date || "";
      const dateB = b.slot.date || "";
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return a.slot.timeSlot.localeCompare(b.slot.timeSlot);
    });

  const handleConfirm = () => {
    if (selectedChoices.length === 0 || disabled) return;

    const chosenSlots = selectedChoices.map((c) => ({
      ...c.slot,
      resourceId: c.resourceId || c.slot.resourceId,
      resourceName: c.resourceName || c.slot.resourceName,
      staffName: c.resourceName || c.slot.resourceName,
    }));
    const firstChoice = selectedChoices[0];

    if (onSelectMultipleSlots && chosenSlots.length > 1) {
      onSelectMultipleSlots(
        chosenSlots,
        firstChoice.resourceId,
        firstChoice.resourceName,
      );
    } else {
      onSelectSlot(
        chosenSlots[0] || firstChoice.slot,
        firstChoice.resourceId,
        firstChoice.resourceName,
      );
    }
  };

  const handleClear = () => {
    setSelectedKeys([]);
  };

  const firstSlot = selectedChoices[0]?.slot;
  const lastSlot = selectedChoices[selectedChoices.length - 1]?.slot;

  return (
    <div
      style={{
        marginTop: "12px",
        padding: "14px",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        background: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: "14px",
            color: "#374151",
            fontWeight: 600,
          }}
        >
          {labels?.availableSlots || t("slots.title")}
        </h4>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
          gap: "8px",
        }}
      >
        {visibleChoices.map((choice) => {
          const isSelected = selectedKeys.includes(choice.key);
          return (
            <Button
              key={choice.key}
              disabled={disabled}
              onClick={() => handleToggleSlot(choice)}
              style={{
                height: "auto",
                padding: "8px 6px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
                backgroundColor: isSelected ? primaryColor : "#f9fafb",
                borderColor: isSelected ? primaryColor : "#e5e7eb",
                color: isSelected ? "#fff" : "#1f2937",
                fontWeight: isSelected ? 600 : 500,
                transition: "all 0.2s ease",
              }}
            >
              {hasMultipleDates && choice.slot.date && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: isSelected ? "#fff" : primaryColor,
                    marginBottom: "1px",
                  }}
                >
                  {choice.slot.date.slice(5).replace("-", "/")}
                </span>
              )}
              <span style={{ fontSize: "14px" }}>{choice.slot.timeSlot}</span>
              {choice.resourceName && (
                <span
                  style={{
                    fontSize: "11px",
                    opacity: isSelected ? 0.9 : 0.65,
                    marginTop: "2px",
                  }}
                >
                  {choice.resourceName}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {(visibleCount < choices.length || onCancel) && (
        <div
          className="ez-booking-card-action-row"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "12px",
            paddingTop: "8px",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          {visibleCount < choices.length ? (
            <Button
              type="link"
              disabled={disabled}
              onClick={() => setVisibleCount((count) => count + 6)}
              style={{
                padding: 0,
                fontSize: "12px",
                color: disabled ? "#9ca3af" : primaryColor,
              }}
            >
              {labels?.showMore ||
                t("slots.showMore", {
                  count: choices.length - visibleCount,
                })}
            </Button>
          ) : (
            <div />
          )}
          {onCancel && (
            <Button
              className="ez-booking-cancel-pill"
              type="text"
              size="small"
              disabled={disabled}
              onClick={onCancel}
              style={{ marginLeft: "auto" }}
            >
              {t("action.cancel")}
            </Button>
          )}
        </div>
      )}

      {isMultiSelectionMode && selectedChoices.length > 0 && (
        <div
          style={{
            marginTop: "14px",
            padding: "10px 12px",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "13px",
              color: "#166534",
            }}
          >
            <span>
              <strong>{locale === "vi" ? "Đã chọn:" : "Selected:"}</strong>{" "}
              {selectedChoices.length === 1
                ? hasMultipleDates && firstSlot?.date
                  ? `${firstSlot.date.slice(5).replace("-", "/")} ${firstSlot.timeSlot}`
                  : firstSlot?.timeSlot
                : hasMultipleDates
                  ? selectedChoices
                      .map(
                        (c) =>
                          `${(c.slot.date || "").slice(5).replace("-", "/") || ""} ${c.slot.timeSlot}`,
                      )
                      .join(", ")
                  : `${firstSlot?.timeSlot} - ${lastSlot?.timeSlot} (${selectedChoices.length} slots)`}
            </span>
            <Button
              type="text"
              size="small"
              onClick={handleClear}
              style={{ fontSize: "12px", color: "#6b7280" }}
            >
              {labels?.clear || (locale === "vi" ? "Bỏ chọn" : "Clear")}
            </Button>
          </div>

          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleConfirm}
            disabled={
              disabled ||
              (targetSlotCount > 1 &&
                selectedChoices.length !== targetSlotCount)
            }
            style={{
              backgroundColor: primaryColor,
              borderColor: primaryColor,
              borderRadius: "6px",
              height: "36px",
              fontWeight: 600,
            }}
          >
            {isGroupBooking && targetSlotCount > 1
              ? selectedChoices.length === targetSlotCount
                ? locale === "vi"
                  ? `Xác nhận đủ ${targetSlotCount} thợ/khung giờ`
                  : `Confirm ${targetSlotCount} staff/slots`
                : locale === "vi"
                  ? `Vui lòng chọn đủ ${targetSlotCount} thợ (${selectedChoices.length}/${targetSlotCount})`
                  : `Please select ${targetSlotCount} staff (${selectedChoices.length}/${targetSlotCount})`
              : bookingType === "single" && targetSlotCount > 1
                ? selectedChoices.length === targetSlotCount
                  ? locale === "vi"
                    ? `Xác nhận đủ ${targetSlotCount} khung giờ`
                    : `Confirm ${targetSlotCount} slots`
                  : locale === "vi"
                    ? `Vui lòng chọn đủ ${targetSlotCount} khung giờ (${selectedChoices.length}/${targetSlotCount})`
                    : `Please select ${targetSlotCount} slots (${selectedChoices.length}/${targetSlotCount})`
                : selectedChoices.length === 1
                  ? locale === "vi"
                    ? `Xác nhận giờ ${firstSlot?.timeSlot}`
                    : `Confirm ${firstSlot?.timeSlot}`
                  : locale === "vi"
                    ? `Xác nhận đặt ${selectedChoices.length} khung giờ`
                    : `Confirm ${selectedChoices.length} slots`}
          </Button>
        </div>
      )}
    </div>
  );
}
