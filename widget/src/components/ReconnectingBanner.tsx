import React from "react";
import { LoadingOutlined } from "@ant-design/icons";

interface ReconnectingBannerProps {
  show: boolean;
}

export const ReconnectingBanner: React.FC<ReconnectingBannerProps> = ({
  show,
}) => {
  if (!show) return null;

  return (
    <div
      style={{
        padding: "6px 12px",
        backgroundColor: "#fff7e6",
        borderBottom: "1px solid #ffd591",
        color: "#d46b08",
        fontSize: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        fontWeight: 500,
      }}
    >
      <LoadingOutlined spin style={{ fontSize: "13px" }} />
      <span>Connecting to server...</span>
    </div>
  );
};
