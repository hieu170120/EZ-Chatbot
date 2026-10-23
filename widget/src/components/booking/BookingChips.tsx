import { useState } from "react";
import { Button, Popover, Input } from "antd";
import { CalendarOutlined, CheckOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { BookingChipItem } from "../../store";

interface BookingChipsProps {
  items: BookingChipItem[];
  onSelect: (item: BookingChipItem) => void;
  onCancel?: () => void;
  primaryColor?: string;
  disabled?: boolean;
  locale?: string;
  bookingType?: "single" | "multiple" | null;
}

const isDateOption = (option: string) =>
  /\(\d{2}\/\d{2}\)$/.test(option.trim());

export function BookingChips({
  items,
  onSelect,
  onCancel,
  primaryColor,
  disabled,
  locale = "en",
  bookingType,
}: BookingChipsProps) {
  const { t } = useTranslation("booking", { lng: locale });
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedServices, setSelectedServices] = useState<
    Array<{ item: BookingChipItem; label: string }>
  >([]);
  const [selectedResources, setSelectedResources] = useState<
    Array<{ item: BookingChipItem; label: string }>
  >([]);
  const [selectedDates, setSelectedDates] = useState<
    Array<{ item: BookingChipItem; label: string }>
  >([]);

  if (!items || items.length === 0) return null;

  const itemLabel = (item: BookingChipItem) => {
    if (item.labelKey) {
      const params = { ...item.labelParams };
      if (item.labelKey === "chip.date" && item.value) {
        params.weekday = new Intl.DateTimeFormat(locale, {
          weekday: "long",
          timeZone: "UTC",
        }).format(new Date(`${item.value}T00:00:00.000Z`));
      }
      const translated = t(item.labelKey, params);
      if (translated && translated !== item.labelKey) {
        return translated;
      }
    }
    const raw = item.label || item.value || "";
    if (raw.startsWith("/keep-booking:")) {
      return raw.replace("/keep-booking:", "").trim();
    }
    return raw;
  };

  const isDateChipGroup = items.some(
    (item) => item.action === "select_date" || isDateOption(itemLabel(item)),
  );
  const isServiceChipGroup = items.some(
    (item) => item.action === "select_service",
  );
  const isResourceChipGroup = items.some(
    (item) => item.action === "select_resource",
  );
  const todayStr = new Date().toISOString().split("T")[0];

  const handleConfirmDatePopover = () => {
    if (!selectedDate) return;
    const [year, month, day] = selectedDate.split("-");
    const dayStr = String(day).padStart(2, "0");
    const monthStr = String(month).padStart(2, "0");

    setPopoverOpen(false);
    const value = `${year}-${monthStr}-${dayStr}`;
    const label = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00.000Z`));
    setSelectedDate("");

    setSelectedDates((prev) => {
      if (prev.some((d) => d.item.value === value)) return prev;
      return [
        ...prev,
        { item: { action: "select_date", value, label }, label },
      ];
    });
  };

  const handleToggleService = (item: BookingChipItem, label: string) => {
    if (disabled) return;
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.item.value === item.value);
      if (exists) {
        return prev.filter((s) => s.item.value !== item.value);
      }
      return [...prev, { item, label }];
    });
  };

  const handleConfirmServices = () => {
    if (selectedServices.length === 0 || disabled) return;
    const values = selectedServices.map((s) => s.item.value || "");
    const labels = selectedServices.map((s) => s.label);
    onSelect({
      action: "select_service",
      value: values.join(","),
      label: labels.join(", "),
      values,
      labels,
    });
  };

  const handleToggleResource = (item: BookingChipItem, label: string) => {
    if (disabled) return;
    setSelectedResources((prev) => {
      const exists = prev.some((r) => r.item.value === item.value);
      if (exists) {
        return prev.filter((r) => r.item.value !== item.value);
      }
      return [...prev, { item, label }];
    });
  };

  const handleConfirmResources = () => {
    if (selectedResources.length === 0 || disabled) return;
    const values = selectedResources.map((r) => r.item.value || "");
    const labels = selectedResources.map((r) => r.label);
    onSelect({
      action: "select_resource",
      value: values.join(","),
      label: labels.join(", "),
      values,
      labels,
    });
  };

  const handleToggleDate = (item: BookingChipItem, label: string) => {
    if (disabled) return;
    setSelectedDates((prev) => {
      const exists = prev.some((d) => d.item.value === item.value);
      if (exists) {
        return prev.filter((d) => d.item.value !== item.value);
      }
      return [...prev, { item, label }];
    });
  };

  const handleConfirmDates = () => {
    if (selectedDates.length === 0 || disabled) return;
    const values = selectedDates.map((d) => d.item.value || "");
    const labels = selectedDates.map((d) => d.label);
    onSelect({
      action: "select_date",
      value: values.join(","),
      label: labels.join(", "),
      values,
      labels,
    });
  };

  const datePickerContent = (
    <div style={{ padding: "4px", width: "210px" }}>
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          marginBottom: "8px",
          color: "#374151",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <CalendarOutlined style={{ color: primaryColor || "#1677ff" }} />
        {t("datePicker.title")}
      </div>
      <Input
        type="date"
        min={todayStr}
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        style={{ width: "100%", marginBottom: "10px", borderRadius: "6px" }}
      />
      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
        <Button
          className="ez-booking-cancel-button"
          size="small"
          onClick={() => {
            setPopoverOpen(false);
            setSelectedDate("");
          }}
          style={{ borderRadius: "6px" }}
        >
          {t("action.cancel")}
        </Button>
        <Button
          type="primary"
          size="small"
          disabled={!selectedDate}
          onClick={handleConfirmDatePopover}
          style={{
            borderRadius: "6px",
            background: !selectedDate ? "#93c5fd" : primaryColor || "#1677ff",
            borderColor: !selectedDate ? "#93c5fd" : primaryColor || "#1677ff",
            color: "#ffffff",
            fontWeight: 500,
          }}
        >
          {t("action.confirm")}
        </Button>
      </div>
    </div>
  );

  return (
    <div
      style={{
        marginTop: "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        {items.map((item, index) => {
          const label = itemLabel(item);
          const opensDatePicker =
            item.action === "choose_date" ||
            (isDateChipGroup &&
              item.action === "submit_text" &&
              !isDateOption(label));

          if (opensDatePicker) {
            return (
              <Popover
                key={index}
                content={datePickerContent}
                trigger="click"
                open={popoverOpen && !disabled}
                onOpenChange={(open) => {
                  if (!disabled) setPopoverOpen(open);
                }}
                placement="top"
                getPopupContainer={(triggerNode) =>
                  (triggerNode.closest(".ez-widget-panel") as HTMLElement) ||
                  document.body
                }
              >
                <Button
                  disabled={disabled}
                  icon={<CalendarOutlined />}
                  style={{
                    borderRadius: "16px",
                    borderColor: disabled
                      ? "#d1d5db"
                      : primaryColor || "#1677ff",
                    color: disabled ? "#9ca3af" : primaryColor || "#1677ff",
                    background: "#fff",
                    fontSize: "13px",
                    padding: "4px 12px",
                    height: "auto",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {label}
                </Button>
              </Popover>
            );
          }

          if (item.action === "select_service") {
            const isSelected = selectedServices.some(
              (s) => s.item.value === item.value,
            );
            return (
              <Button
                key={index}
                onClick={() => handleToggleService(item, label)}
                disabled={disabled}
                icon={isSelected ? <CheckOutlined /> : undefined}
                style={{
                  borderRadius: "16px",
                  borderColor: isSelected
                    ? primaryColor || "#1677ff"
                    : disabled
                      ? "#d1d5db"
                      : primaryColor || "#1677ff",
                  color: isSelected
                    ? "#fff"
                    : disabled
                      ? "#9ca3af"
                      : primaryColor || "#1677ff",
                  background: isSelected ? primaryColor || "#1677ff" : "#fff",
                  fontSize: "13px",
                  padding: "4px 12px",
                  height: "auto",
                  fontWeight: isSelected ? 600 : 400,
                  boxShadow: isSelected
                    ? "0 2px 6px rgba(22, 119, 255, 0.25)"
                    : undefined,
                  transition: "all 0.2s ease",
                }}
              >
                {label}
              </Button>
            );
          }

          if (item.action === "select_resource") {
            const isSelected = selectedResources.some(
              (r) => r.item.value === item.value,
            );
            return (
              <Button
                key={index}
                onClick={() => handleToggleResource(item, label)}
                disabled={disabled}
                icon={isSelected ? <CheckOutlined /> : undefined}
                style={{
                  borderRadius: "16px",
                  borderColor: isSelected
                    ? primaryColor || "#1677ff"
                    : disabled
                      ? "#d1d5db"
                      : primaryColor || "#1677ff",
                  color: isSelected
                    ? "#fff"
                    : disabled
                      ? "#9ca3af"
                      : primaryColor || "#1677ff",
                  background: isSelected ? primaryColor || "#1677ff" : "#fff",
                  fontSize: "13px",
                  padding: "4px 12px",
                  height: "auto",
                  fontWeight: isSelected ? 600 : 400,
                  boxShadow: isSelected
                    ? "0 2px 6px rgba(22, 119, 255, 0.25)"
                    : undefined,
                  transition: "all 0.2s ease",
                }}
              >
                {label}
              </Button>
            );
          }

          if (
            isDateChipGroup &&
            (item.action === "select_date" || isDateOption(label))
          ) {
            if (bookingType === "single") {
              return (
                <Button
                  key={index}
                  onClick={() => onSelect({ ...item, label })}
                  disabled={disabled}
                  style={{
                    borderRadius: "16px",
                    borderColor: disabled
                      ? "#d1d5db"
                      : primaryColor || "#1677ff",
                    color: disabled ? "#9ca3af" : primaryColor || "#1677ff",
                    background: "#fff",
                    fontSize: "13px",
                    padding: "4px 12px",
                    height: "auto",
                  }}
                >
                  {label}
                </Button>
              );
            }
            const isSelected = selectedDates.some(
              (d) => d.item.value === item.value,
            );
            return (
              <Button
                key={index}
                onClick={() => handleToggleDate(item, label)}
                disabled={disabled}
                icon={isSelected ? <CheckOutlined /> : undefined}
                style={{
                  borderRadius: "16px",
                  borderColor: isSelected
                    ? primaryColor || "#1677ff"
                    : disabled
                      ? "#d1d5db"
                      : primaryColor || "#1677ff",
                  color: isSelected
                    ? "#fff"
                    : disabled
                      ? "#9ca3af"
                      : primaryColor || "#1677ff",
                  background: isSelected ? primaryColor || "#1677ff" : "#fff",
                  fontSize: "13px",
                  padding: "4px 12px",
                  height: "auto",
                  fontWeight: isSelected ? 600 : 400,
                  boxShadow: isSelected
                    ? "0 2px 6px rgba(22, 119, 255, 0.25)"
                    : undefined,
                  transition: "all 0.2s ease",
                }}
              >
                {label}
              </Button>
            );
          }

          return (
            <Button
              key={index}
              onClick={() => onSelect({ ...item, label })}
              disabled={disabled}
              style={{
                borderRadius: "16px",
                borderColor: disabled ? "#d1d5db" : primaryColor || "#1677ff",
                color: disabled ? "#9ca3af" : primaryColor || "#1677ff",
                background: "#fff",
                fontSize: "13px",
                padding: "4px 12px",
                height: "auto",
              }}
            >
              {label}
            </Button>
          );
        })}
      </div>

      {isServiceChipGroup && selectedServices.length > 0 && (
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <Button
            type="primary"
            size="small"
            onClick={handleConfirmServices}
            disabled={disabled}
            style={{
              borderRadius: "14px",
              background: primaryColor || "#1677ff",
              borderColor: primaryColor || "#1677ff",
              fontWeight: 600,
              fontSize: "12px",
              padding: "2px 14px",
              height: "28px",
              boxShadow: "0 2px 6px rgba(22, 119, 255, 0.3)",
            }}
          >
            {t("action.continue")} ({selectedServices.length})
          </Button>
        </div>
      )}

      {isResourceChipGroup && selectedResources.length > 0 && (
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <Button
            type="primary"
            size="small"
            onClick={handleConfirmResources}
            disabled={disabled}
            style={{
              borderRadius: "14px",
              background: primaryColor || "#1677ff",
              borderColor: primaryColor || "#1677ff",
              fontWeight: 600,
              fontSize: "12px",
              padding: "2px 14px",
              height: "28px",
              boxShadow: "0 2px 6px rgba(22, 119, 255, 0.3)",
            }}
          >
            {t("action.continue")} ({selectedResources.length})
          </Button>
        </div>
      )}

      {isDateChipGroup && selectedDates.length > 0 && (
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <Button
            type="primary"
            size="small"
            onClick={handleConfirmDates}
            disabled={disabled}
            style={{
              borderRadius: "14px",
              background: primaryColor || "#1677ff",
              borderColor: primaryColor || "#1677ff",
              fontWeight: 600,
              fontSize: "12px",
              padding: "2px 14px",
              height: "28px",
              boxShadow: "0 2px 6px rgba(22, 119, 255, 0.3)",
            }}
          >
            {t("action.continue")} ({selectedDates.length})
          </Button>
        </div>
      )}

      {onCancel && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "12px",
            paddingTop: "2px",
          }}
        >
          <Button
            className="ez-booking-cancel-pill"
            type="text"
            size="small"
            onClick={onCancel}
            disabled={disabled}
            style={{ height: "26px", padding: "2px 10px", fontSize: "12px" }}
          >
            {t("action.cancel")}
          </Button>
        </div>
      )}
    </div>
  );
}
