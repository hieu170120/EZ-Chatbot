import { useState } from "react";
import { Form, Input, Button } from "antd";
import {
  UserOutlined,
  MailOutlined,
  SendOutlined,
  SafetyCertificateOutlined,
  LockOutlined,
  RobotOutlined,
} from "@ant-design/icons";

type RegistrationFormProps = {
  onStart: (values: {
    name?: string;
    email?: string;
    firstMessage?: string;
  }) => void;
  onStartAnonymous?: (firstMessage?: string) => void;
  appearanceSettings?: {
    primaryColor?: string | null;
    backgroundColor?: string | null;
    chatWindowTitle?: string | null;
    botAvatar?: string | null;
    defaultGreetingMessage?: string | null;
  } | null;
  initialValues?: {
    name?: string;
    email?: string;
  };
};

export function RegistrationForm({
  onStart,
  onStartAnonymous,
  appearanceSettings,
  initialValues,
}: RegistrationFormProps) {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const primaryColor = appearanceSettings?.primaryColor || "#6366f1";
  const title = appearanceSettings?.chatWindowTitle || "Live Support";
  const botAvatar = appearanceSettings?.botAvatar;

  const handleStart = (values: {
    name?: string;
    email?: string;
    firstMessage?: string;
  }) => {
    setIsSubmitting(true);
    onStart(values);
  };

  const handleStartAnonymous = () => {
    const firstMessage = form.getFieldValue("firstMessage") || "";
    setIsSubmitting(true);
    if (onStartAnonymous) {
      onStartAnonymous(firstMessage);
    } else {
      onStart({ name: "", email: "", firstMessage });
    }
  };

  return (
    <div
      className="ez-widget-body ez-reg-container"
      style={
        {
          "--ez-primary": primaryColor,
          backgroundColor: appearanceSettings?.backgroundColor || undefined,
        } as React.CSSProperties
      }
    >
      {/* Hero Header Section */}
      <div className="ez-reg-hero">
        <div className="ez-reg-avatar-wrap">
          {botAvatar ? (
            <img
              src={botAvatar}
              alt="Bot Avatar"
              className="ez-reg-avatar-img"
            />
          ) : (
            <RobotOutlined className="ez-reg-avatar-icon" />
          )}
          <span className="ez-reg-status-dot" title="Online" />
        </div>
        <h3 className="ez-reg-title">{title}</h3>
        <p className="ez-reg-subtitle">
          <span>Explore our services!</span>
          <br />
          <span>Fill in your details or jump straight in anonymously!</span>
        </p>
      </div>

      {/* Main Registration Form Card */}
      <div className="ez-reg-card">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleStart}
          requiredMark={false}
          className="ez-reg-form"
          initialValues={{
            name: initialValues?.name || "",
            email: initialValues?.email || "",
          }}
        >
          <Form.Item
            name="name"
            rules={[{ required: true, message: "Please enter your name" }]}
          >
            <Input
              prefix={<UserOutlined className="ez-reg-prefix-icon" />}
              placeholder="Your name *"
              className="ez-reg-input"
              maxLength={60}
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              {
                required: true,
                type: "email",
                message: "Please enter a valid email",
              },
            ]}
          >
            <Input
              prefix={<MailOutlined className="ez-reg-prefix-icon" />}
              placeholder="Your email *"
              className="ez-reg-input"
              maxLength={100}
            />
          </Form.Item>

          <Form.Item name="firstMessage">
            <Input.TextArea
              placeholder="How can we help you today? (optional)..."
              rows={2}
              className="ez-reg-textarea"
              maxLength={500}
            />
          </Form.Item>

          {/* Primary Submit Button */}
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={isSubmitting}
            icon={<SendOutlined />}
            className="ez-reg-btn-primary"
            style={{
              backgroundColor: primaryColor,
              borderColor: primaryColor,
            }}
          >
            Start Conversation
          </Button>

          {/* Elegant Divider */}
          <div className="ez-reg-divider">
            <span className="ez-reg-divider-line" />
            <span className="ez-reg-divider-text">or continue privately</span>
            <span className="ez-reg-divider-line" />
          </div>

          {/* Anonymous Action Button */}
          <Button
            type="default"
            block
            onClick={handleStartAnonymous}
            loading={isSubmitting}
            icon={<SafetyCertificateOutlined style={{ color: "#10b981" }} />}
            className="ez-reg-btn-anon"
          >
            Chat Anonymously
          </Button>
        </Form>
      </div>

      {/* Trust & Privacy Guarantee */}
      <div className="ez-reg-trust">
        <LockOutlined style={{ fontSize: 11 }} />
        <span>Secure & encrypted session • No spam guaranteed</span>
      </div>
    </div>
  );
}
