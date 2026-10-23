import React from "react";
import { Button, Input, Select, Tabs } from "antd";
import {
  CheckCircleFilled,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { AsYouType, type CountryCode } from "libphonenumber-js";
import type { BookingResourceItem, BookingServiceItem } from "../../store";
import {
  PHONE_COUNTRIES,
  type EditableSlotItem,
} from "./hooks/useBookingSummaryForm";

export interface BookingSummaryEditorProps {
  text: Record<string, string>;
  editName: string;
  setEditName: (name: string) => void;
  editPhone: string;
  editPhoneCountry: CountryCode;
  setEditPhoneCountry: (country: CountryCode) => void;
  editEmail: string;
  setEditEmail: (email: string) => void;
  editSlots: EditableSlotItem[];
  activeSlotTabIndex: string;
  setActiveSlotTabIndex: (key: string) => void;
  slotsCache: Record<string, string[]>;
  loadingCacheKey: string | null;
  isPhoneValid: boolean;
  isEmailValid: boolean;
  isFormValid: boolean;
  bookingServices: BookingServiceItem[];
  bookingResources: BookingResourceItem[];
  isGeneral: boolean;
  primaryColor?: string;
  onPhoneChange: (val: string) => void;
  onSlotUpdate: (
    index: number,
    field: keyof EditableSlotItem,
    val: string | undefined,
  ) => void;
  onAddSlot: () => void;
  onRemoveSlot: (index: number) => void;
  onApplyFirstToAll: (field: "date" | "resourceId" | "serviceId") => void;
  onCancel: () => void;
  onSave: () => void;
  getResolvedServiceId: (idOrName?: string) => string | undefined;
  getResolvedResourceId: (idOrName?: string) => string | undefined;
}

export const BookingSummaryEditor: React.FC<BookingSummaryEditorProps> = ({
  text,
  editName,
  setEditName,
  editPhone,
  editPhoneCountry,
  setEditPhoneCountry,
  editEmail,
  setEditEmail,
  editSlots,
  activeSlotTabIndex,
  setActiveSlotTabIndex,
  slotsCache,
  loadingCacheKey,
  isPhoneValid,
  isEmailValid,
  isFormValid,
  bookingServices,
  bookingResources,
  isGeneral,
  primaryColor,
  onPhoneChange,
  onSlotUpdate,
  onAddSlot,
  onRemoveSlot,
  onApplyFirstToAll,
  onCancel,
  onSave,
  getResolvedServiceId,
  getResolvedResourceId,
}) => {
  const todayStr = new Date().toISOString().split("T")[0];
  const activeSlotIndex = Math.min(
    Math.max(0, Number(activeSlotTabIndex) || 0),
    Math.max(0, editSlots.length - 1),
  );
  const activeSlot = editSlots[activeSlotIndex];
  const activeCacheKey = activeSlot
    ? `${activeSlot.date}|${activeSlot.resourceId || ""}|${activeSlot.serviceId || ""}`
    : "";
  const activeFreeSlots = (activeCacheKey && slotsCache[activeCacheKey]) || [];
  const isLoadingActiveSlots = loadingCacheKey === activeCacheKey;

  return (
    <div
      style={{
        marginTop: "12px",
        padding: "16px",
        border: "1px solid #d9d9d9",
        borderRadius: "12px",
        background: "#ffffff",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: "15px",
            fontWeight: 600,
            color: "#111827",
          }}
        >
          {text.title} ({text.edit})
        </h4>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Customer Name */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              color: "#4b5563",
              marginBottom: "4px",
            }}
          >
            {text.name} *
          </label>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder={text.name}
          />
        </div>

        {/* Phone with country code selector */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              color: "#4b5563",
              marginBottom: "4px",
            }}
          >
            {text.phone} *
          </label>
          <div style={{ display: "flex", gap: "6px" }}>
            <Select
              value={editPhoneCountry}
              onChange={(val: CountryCode) => {
                setEditPhoneCountry(val);
                const clean = editPhone.replace(/\D/g, "");
                if (clean) {
                  onPhoneChange(new AsYouType(val).input(clean));
                }
              }}
              popupMatchSelectWidth={false}
              style={{ width: "90px", flexShrink: 0 }}
              options={PHONE_COUNTRIES.map((c) => ({
                value: c.code,
                label: (
                  <span style={{ fontSize: "12px" }}>
                    {c.flag} {c.dialCode}
                  </span>
                ),
              }))}
            />
            <Input
              value={editPhone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="0912 345 678"
              status={
                editPhone.trim().length > 0 && !isPhoneValid
                  ? "error"
                  : undefined
              }
              suffix={
                isPhoneValid ? (
                  <CheckCircleFilled style={{ color: "#22c55e" }} />
                ) : null
              }
              style={{ flex: 1 }}
            />
          </div>
          {editPhone.trim().length > 0 && !isPhoneValid && (
            <div
              style={{
                fontSize: "11px",
                color: "#ef4444",
                marginTop: "4px",
                paddingLeft: "2px",
              }}
            >
              {text.invalidPhone}
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              color: "#4b5563",
              marginBottom: "4px",
            }}
          >
            {text.email} ({text.optional})
          </label>
          <Input
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            placeholder="example@gmail.com"
            status={
              editEmail.trim().length > 0 && !isEmailValid ? "error" : undefined
            }
            suffix={
              editEmail.trim().length > 0 && isEmailValid ? (
                <CheckCircleFilled style={{ color: "#22c55e" }} />
              ) : null
            }
          />
          {editEmail.trim().length > 0 && !isEmailValid && (
            <div
              style={{
                fontSize: "11px",
                color: "#ef4444",
                marginTop: "4px",
                paddingLeft: "2px",
              }}
            >
              {text.invalidEmail}
            </div>
          )}
        </div>

        {/* Slots Configuration Section */}
        <div
          style={{
            borderTop: "1px solid #f1f5f9",
            paddingTop: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#1e293b",
              }}
            >
              {text.slotSchedule} ({editSlots.length} {text.slot})
            </span>
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={onAddSlot}
              style={{
                borderRadius: "6px",
                fontSize: "12px",
                borderColor: primaryColor || "#1677ff",
                color: primaryColor || "#1677ff",
              }}
            >
              {text.addSlot}
            </Button>
          </div>

          {/* Tabs for multiple slots */}
          {editSlots.length > 1 && (
            <Tabs
              activeKey={activeSlotTabIndex}
              onChange={setActiveSlotTabIndex}
              size="small"
              type="card"
              style={{ marginBottom: "2px" }}
              items={editSlots.map((slot, idx) => ({
                key: String(idx),
                label: (
                  <span style={{ fontSize: "12px" }}>
                    {text.slot} {idx + 1}
                    {slot.timeSlot ? ` (${slot.timeSlot})` : ""}
                  </span>
                ),
              }))}
            />
          )}

          {/* Active Slot Configuration */}
          {activeSlot && (
            <div
              key={activeSlot.id}
              style={{
                background: "#f8fafc",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  {text.slot} {activeSlotIndex + 1}
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  {editSlots.length > 1 && (
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => onApplyFirstToAll("resourceId")}
                      style={{ fontSize: "11px", borderRadius: "4px" }}
                    >
                      {text.applyToAllSlots}
                    </Button>
                  )}
                  {editSlots.length > 1 && (
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => onRemoveSlot(activeSlotIndex)}
                      style={{ fontSize: "11px", borderRadius: "4px" }}
                    />
                  )}
                </div>
              </div>

              {/* Slot Date */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#64748b",
                    marginBottom: "3px",
                  }}
                >
                  {text.date} *
                </label>
                <Input
                  type="date"
                  min={todayStr}
                  value={activeSlot.date}
                  onChange={(e) =>
                    onSlotUpdate(activeSlotIndex, "date", e.target.value)
                  }
                  style={{ width: "100%", borderRadius: "6px" }}
                />
              </div>

              {/* Service Selection */}
              {bookingServices.length > 0 && (
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#64748b",
                      marginBottom: "3px",
                    }}
                  >
                    {text.service} {!isGeneral && "*"}
                  </label>
                  <Select
                    style={{ width: "100%" }}
                    allowClear={isGeneral}
                    value={
                      getResolvedServiceId(activeSlot.serviceId) ||
                      activeSlot.serviceId ||
                      undefined
                    }
                    onChange={(val) =>
                      onSlotUpdate(activeSlotIndex, "serviceId", val)
                    }
                    options={bookingServices.map((s) => ({
                      value: s.id || s.name,
                      label: s.name,
                    }))}
                    placeholder={text.selectService}
                    getPopupContainer={(triggerNode) =>
                      (triggerNode.closest(
                        ".ez-widget-panel",
                      ) as HTMLElement) || document.body
                    }
                  />
                </div>
              )}

              {/* Staff Selection */}
              {bookingResources.length > 0 && (
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#64748b",
                      marginBottom: "3px",
                    }}
                  >
                    {text.staff} *
                  </label>
                  <Select
                    style={{ width: "100%" }}
                    value={
                      getResolvedResourceId(activeSlot.resourceId) ||
                      activeSlot.resourceId ||
                      undefined
                    }
                    onChange={(val) =>
                      onSlotUpdate(activeSlotIndex, "resourceId", val)
                    }
                    options={bookingResources.map((r) => ({
                      value: r.id || r.name,
                      label: r.name,
                    }))}
                    placeholder={text.selectStaff}
                    getPopupContainer={(triggerNode) =>
                      (triggerNode.closest(
                        ".ez-widget-panel",
                      ) as HTMLElement) || document.body
                    }
                  />
                </div>
              )}

              {/* Time Slot Picker */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#64748b",
                    marginBottom: "3px",
                  }}
                >
                  {text.time} *
                </label>
                <Select
                  style={{ width: "100%" }}
                  loading={isLoadingActiveSlots}
                  value={activeSlot.timeSlot || undefined}
                  onChange={(val) =>
                    onSlotUpdate(activeSlotIndex, "timeSlot", val)
                  }
                  placeholder={
                    isLoadingActiveSlots
                      ? text.loadingSlots
                      : activeFreeSlots.length === 0
                        ? text.noSlots
                        : text.selectTime
                  }
                  notFoundContent={
                    isLoadingActiveSlots ? text.loadingSlots : text.noSlots
                  }
                  getPopupContainer={(triggerNode) =>
                    (triggerNode.closest(".ez-widget-panel") as HTMLElement) ||
                    document.body
                  }
                  options={activeFreeSlots.map((t) => ({
                    label: t,
                    value: t,
                  }))}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons in Edit Mode */}
      <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
        <Button onClick={onCancel} block style={{ borderRadius: "8px" }}>
          {text.cancel}
        </Button>
        <Button
          type="primary"
          onClick={onSave}
          disabled={!isFormValid}
          block
          style={{
            borderRadius: "8px",
            background: !isFormValid ? "#93c5fd" : primaryColor || "#1677ff",
            borderColor: !isFormValid ? "#93c5fd" : primaryColor || "#1677ff",
            color: "#ffffff",
            fontWeight: 500,
          }}
        >
          {text.saveChanges}
        </Button>
      </div>
    </div>
  );
};
