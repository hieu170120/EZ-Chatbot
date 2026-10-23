import React from "react";
import { Button } from "antd";
import type { BookingSummaryPayload } from "../../store";

export interface BookingSummaryViewProps {
  payload: BookingSummaryPayload;
  text: Record<string, string>;
  formattedServiceDisplay: string;
  formattedResourceDisplay: string;
  formattedDateDisplay: string;
  formattedTimeDisplay: string;
  mergedSchedule: Array<{
    serviceName: string;
    date?: string;
    startTime: string;
    endTime: string;
    slotCount: number;
    staffName?: string;
  }>;
  disabled?: boolean;
  primaryColor?: string;
  onStartEdit: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const BookingSummaryView: React.FC<BookingSummaryViewProps> = ({
  payload,
  text,
  formattedServiceDisplay,
  formattedResourceDisplay,
  formattedDateDisplay,
  formattedTimeDisplay,
  mergedSchedule,
  disabled,
  primaryColor,
  onStartEdit,
  onConfirm,
  onCancel,
}) => {
  return (
    <div
      style={{
        marginTop: "12px",
        padding: "16px",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        background: "#ffffff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
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
          {text.title}
        </h4>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {formattedServiceDisplay !== text.empty && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#6b7280", fontSize: "13px" }}>
              {text.service}:
            </span>
            <span
              style={{
                fontWeight: 500,
                fontSize: "13px",
                color: "#111827",
                textAlign: "right",
                maxWidth: "65%",
              }}
            >
              {formattedServiceDisplay}
            </span>
          </div>
        )}

        {/* Merged Service & Slot Schedule Breakdown */}
        {mergedSchedule.length > 0 && (
          <div
            style={{
              padding: "8px 10px",
              background: "#f8fafc",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              marginTop: "2px",
              marginBottom: "2px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#64748b",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {text.slotSchedule}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {mergedSchedule.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    {item.serviceName ? (
                      <strong style={{ color: "#1e293b" }}>
                        {item.serviceName}
                      </strong>
                    ) : (
                      <strong style={{ color: "#1e293b" }}>
                        {item.staffName || `${text.slot}`}
                      </strong>
                    )}
                    {item.staffName && item.serviceName && (
                      <span
                        style={{
                          marginLeft: "6px",
                          fontSize: "11px",
                          color: "#64748b",
                          fontWeight: 500,
                        }}
                      >
                        ({item.staffName})
                      </span>
                    )}
                    {item.slotCount > 1 && (
                      <span
                        style={{
                          marginLeft: "4px",
                          fontSize: "11px",
                          color: "#64748b",
                        }}
                      >
                        ({item.slotCount} {text.slot})
                      </span>
                    )}
                  </div>
                  <span style={{ fontWeight: 500, color: "#475569" }}>
                    {item.date && item.date !== payload.date
                      ? `${item.date} `
                      : ""}
                    {item.startTime} - {item.endTime}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#6b7280", fontSize: "13px" }}>
            {text.staff}:
          </span>
          <span style={{ fontWeight: 500, fontSize: "13px", color: "#111827" }}>
            {formattedResourceDisplay}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#6b7280", fontSize: "13px" }}>
            {text.name}:
          </span>
          <span style={{ fontWeight: 500, fontSize: "13px", color: "#111827" }}>
            {payload.customerName || text.empty}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#6b7280", fontSize: "13px" }}>
            {text.phone}:
          </span>
          <span style={{ fontWeight: 500, fontSize: "13px", color: "#111827" }}>
            {payload.phone || text.empty}
          </span>
        </div>

        {payload.customerEmail && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#6b7280", fontSize: "13px" }}>
              {text.email}:
            </span>
            <span
              style={{ fontWeight: 500, fontSize: "13px", color: "#111827" }}
            >
              {payload.customerEmail}
            </span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#6b7280", fontSize: "13px" }}>
            {text.date}:
          </span>
          <span style={{ fontWeight: 500, fontSize: "13px", color: "#111827" }}>
            {formattedDateDisplay}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#6b7280", fontSize: "13px" }}>
            {text.time}:
          </span>
          <span style={{ fontWeight: 500, fontSize: "13px", color: "#111827" }}>
            {formattedTimeDisplay}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "14px",
          alignItems: "stretch",
        }}
      >
        {onCancel && (
          <Button
            className="ez-booking-cancel-button"
            onClick={onCancel}
            disabled={disabled}
            style={{
              flex: 1,
              borderRadius: "6px",
              height: "32px",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {text.cancel}
          </Button>
        )}
        <Button
          onClick={onStartEdit}
          disabled={disabled}
          style={{
            flex: 1,
            borderRadius: "6px",
            height: "32px",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          {text.edit}
        </Button>
        <Button
          type="primary"
          onClick={onConfirm}
          disabled={disabled}
          style={{
            flex: 1,
            borderRadius: "6px",
            height: "32px",
            fontSize: "13px",
            fontWeight: 500,
            background: primaryColor || "#1677ff",
            borderColor: primaryColor || "#1677ff",
          }}
        >
          {text.confirm}
        </Button>
      </div>
    </div>
  );
};
