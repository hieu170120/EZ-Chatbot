import React from "react";
import {
  CloseOutlined,
  DownloadOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useVisitorChatStore } from "../store";
import { downloadImage } from "../utils/download.utils";

export const ImagePreviewModal: React.FC = () => {
  const { previewImages, previewIndex, setPreview, closePreview } =
    useVisitorChatStore();

  if (!previewImages || previewImages.length === 0) {
    return null;
  }

  const currentImage = previewImages[previewIndex];

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentImage) {
      await downloadImage(currentImage, "attachment.png");
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewIndex > 0) {
      setPreview(previewImages, previewIndex - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewIndex < previewImages.length - 1) {
      setPreview(previewImages, previewIndex + 1);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",
      }}
      onClick={closePreview}
    >
      <div
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          display: "flex",
          gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <a
          onClick={handleDownload}
          style={{
            color: "white",
            fontSize: 24,
            cursor: "pointer",
            textDecoration: "none",
          }}
          title="Download image"
        >
          <DownloadOutlined />
        </a>
        <CloseOutlined
          onClick={closePreview}
          style={{ color: "white", fontSize: 24, cursor: "pointer" }}
          title="Close preview"
        />
      </div>

      {previewImages.length > 1 && (
        <>
          <div
            style={{
              position: "absolute",
              left: 24,
              color: "white",
              fontSize: 32,
              cursor: previewIndex > 0 ? "pointer" : "not-allowed",
              opacity: previewIndex > 0 ? 1 : 0.3,
            }}
            onClick={handlePrev}
            title="Previous image"
          >
            <LeftOutlined />
          </div>
          <div
            style={{
              position: "absolute",
              right: 24,
              color: "white",
              fontSize: 32,
              cursor:
                previewIndex < previewImages.length - 1
                  ? "pointer"
                  : "not-allowed",
              opacity: previewIndex < previewImages.length - 1 ? 1 : 0.3,
            }}
            onClick={handleNext}
            title="Next image"
          >
            <RightOutlined />
          </div>
        </>
      )}

      <img
        src={currentImage}
        alt="Preview attachment"
        style={{
          maxWidth: "80%",
          maxHeight: "80%",
          objectFit: "contain",
          borderRadius: 8,
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};
