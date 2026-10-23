import { Button, Badge } from "antd";
import { CloseOutlined, CustomerServiceOutlined } from "@ant-design/icons";
import { useVisitorChatStore } from "../store";

type ChatLauncherProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
};

export function ChatLauncher({ isOpen, setIsOpen }: ChatLauncherProps) {
  const { unreadCount, resetUnreadCount, appearanceSettings } =
    useVisitorChatStore();

  const handleToggle = () => {
    if (!isOpen) {
      resetUnreadCount();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div
      className="ez-widget-launcher-wrapper"
      style={{
        position: "absolute",
        bottom: window.innerWidth <= 480 ? "12px" : "20px",
        left:
          appearanceSettings?.chatButtonPosition === "Bottom Left"
            ? window.innerWidth <= 480
              ? "12px"
              : "20px"
            : undefined,
        right:
          appearanceSettings?.chatButtonPosition !== "Bottom Left"
            ? window.innerWidth <= 480
              ? "12px"
              : "20px"
            : "auto",
        zIndex: 50,
        pointerEvents: "auto",
      }}
    >
      <Badge
        count={isOpen ? 0 : unreadCount}
        className="ez-widget-launcher-badge-inner"
      >
        {appearanceSettings?.chatButtonText && !isOpen ? (
          <Button
            key="pill-launcher"
            type="primary"
            size="large"
            className="ez-widget-launcher ez-widget-launcher-with-text"
            style={{
              backgroundColor: appearanceSettings?.primaryColor || undefined,
              borderRadius: "28px",
              width: "auto",
              minWidth: "auto",
              padding: "0 24px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
            onClick={handleToggle}
          >
            <div className="ez-widget-launcher-icon-box">
              {appearanceSettings?.launcherIcon ? (
                <img
                  src={appearanceSettings.launcherIcon}
                  alt="Launcher"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <CustomerServiceOutlined style={{ fontSize: 24 }} />
              )}
            </div>
            <span style={{ fontSize: "16px", fontWeight: 500 }}>
              {appearanceSettings.chatButtonText}
            </span>
          </Button>
        ) : (
          <Button
            key="circle-launcher"
            type="primary"
            shape="circle"
            size="large"
            className={`ez-widget-launcher ${isOpen ? "is-open" : ""}`}
            aria-label={isOpen ? "Close chat" : "Open chat"}
            style={{
              backgroundColor: appearanceSettings?.primaryColor || undefined,
            }}
            onClick={handleToggle}
          >
            <div
              className={`ez-widget-launcher-icon-wrapper ${
                isOpen ? "is-open" : ""
              }`}
            >
              <div className="ez-widget-launcher-icon ez-widget-launcher-icon-chat">
                {appearanceSettings?.launcherIcon ? (
                  <img
                    src={appearanceSettings.launcherIcon}
                    alt="Launcher"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <CustomerServiceOutlined style={{ fontSize: 24 }} />
                )}
              </div>
              <div className="ez-widget-launcher-icon ez-widget-launcher-icon-close">
                <CloseOutlined style={{ fontSize: 22 }} />
              </div>
            </div>
          </Button>
        )}
      </Badge>
    </div>
  );
}
