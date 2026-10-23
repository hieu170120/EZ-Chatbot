import { useState, useMemo } from "react";
import { Input, Select, Button } from "antd";
import {
  PhoneOutlined,
  SendOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";
import { AsYouType, type CountryCode } from "libphonenumber-js";
import { useTranslation } from "react-i18next";
import { validateAndFormatPhoneNumber } from "../../utils/phone-validator.utils";

interface InlinePhoneInputProps {
  onSend: (phone: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
  primaryColor?: string;
  locale?: string;
}

interface CountryOption {
  code: CountryCode;
  label: string;
  flag: string;
  dialCode: string;
}

const COUNTRIES: CountryOption[] = [
  { code: "VN", label: "Việt Nam", flag: "🇻🇳", dialCode: "+84" },
  { code: "US", label: "United States", flag: "🇺🇸", dialCode: "+1" },
  { code: "GB", label: "United Kingdom", flag: "🇬🇧", dialCode: "+44" },
  { code: "JP", label: "Japan", flag: "🇯🇵", dialCode: "+81" },
  { code: "KR", label: "South Korea", flag: "🇰🇷", dialCode: "+82" },
  { code: "AU", label: "Australia", flag: "🇦🇺", dialCode: "+61" },
  { code: "SG", label: "Singapore", flag: "🇸🇬", dialCode: "+65" },
  { code: "CA", label: "Canada", flag: "🇨🇦", dialCode: "+1" },
  { code: "DE", label: "Germany", flag: "🇩🇪", dialCode: "+49" },
  { code: "FR", label: "France", flag: "🇫🇷", dialCode: "+33" },
];

export function InlinePhoneInput({
  onSend,
  onCancel,
  disabled = false,
  primaryColor = "#1677ff",
  locale = "en",
}: InlinePhoneInputProps) {
  const { t } = useTranslation("booking", { lng: locale });
  const [country, setCountry] = useState<CountryCode>("VN");
  const [rawInput, setRawInput] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const selectedCountry = useMemo(
    () => COUNTRIES.find((c) => c.code === country) || COUNTRIES[0],
    [country],
  );
  const countryDisplayName = useMemo(
    () =>
      new Intl.DisplayNames([locale], { type: "region" }).of(
        selectedCountry.code,
      ) || selectedCountry.label,
    [locale, selectedCountry],
  );

  // Validate phone number using libphonenumber-js and Vietnam national rules
  const validationResult = useMemo(() => {
    return validateAndFormatPhoneNumber(rawInput, country);
  }, [rawInput, country]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Format as-you-type using libphonenumber-js
    const formatted = new AsYouType(country).input(val);
    setRawInput(formatted);
  };

  const handleCountryChange = (newCountry: CountryCode) => {
    setCountry(newCountry);
    // re-format existing input with new country
    const cleanDigits = rawInput.replace(/\D/g, "");
    if (cleanDigits) {
      const formatted = new AsYouType(newCountry).input(cleanDigits);
      setRawInput(formatted);
    }
  };

  const handleSend = () => {
    if (!validationResult.isValid || disabled || isSubmitted) return;
    setIsSubmitted(true);
    onSend(validationResult.formattedNumber);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && validationResult.isValid && !disabled) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isSubmitted) {
    return (
      <div
        style={{
          marginTop: "8px",
          padding: "8px 12px",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "12px",
          fontSize: "13px",
          color: "#166534",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <CheckCircleFilled style={{ color: "#22c55e" }} />
        <span>
          {t("phoneInput.submitted", {
            phone: validationResult.formattedNumber,
          })}
        </span>
      </div>
    );
  }

  const isDirty = rawInput.trim().length > 0;
  const isInvalid = isDirty && !validationResult.isValid;

  return (
    <div
      style={{
        marginTop: "8px",
        padding: "10px",
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        minWidth: "260px",
        maxWidth: "320px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "#374151",
          marginBottom: "8px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <PhoneOutlined style={{ color: primaryColor }} />
        <span>{t("phoneInput.title")}</span>
      </div>

      <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
        <Select
          value={country}
          onChange={handleCountryChange}
          disabled={disabled}
          popupMatchSelectWidth={false}
          getPopupContainer={(triggerNode) =>
            (triggerNode.closest(".ez-widget-panel") as HTMLElement) ||
            document.body
          }
          style={{ width: "90px", flexShrink: 0 }}
          options={COUNTRIES.map((c) => ({
            value: c.code,
            label: (
              <span style={{ fontSize: "12px" }}>
                {c.flag} {c.dialCode}
              </span>
            ),
          }))}
        />

        <Input
          value={rawInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            selectedCountry.code === "VN"
              ? "0912 345 678"
              : t("phoneInput.placeholder")
          }
          status={isInvalid ? "error" : undefined}
          suffix={
            validationResult.isValid ? (
              <CheckCircleFilled style={{ color: "#22c55e" }} />
            ) : null
          }
          style={{
            flex: 1,
            minWidth: 0,
            borderRadius: "6px",
          }}
        />
      </div>

      {isInvalid && (
        <div
          style={{
            fontSize: "11px",
            color: "#ef4444",
            marginBottom: "8px",
            paddingLeft: "2px",
          }}
        >
          {t("phoneInput.invalid", { country: countryDisplayName })}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <Button
          className="ez-booking-cancel-button"
          onClick={() => {
            if (onCancel) {
              onCancel();
            } else {
              onSend(
                `/abandon-booking ${JSON.stringify({ locale })} :: ${t("action.cancel")}`,
              );
            }
          }}
          disabled={disabled}
          style={{
            flex: 1,
            borderRadius: "6px",
            height: "32px",
          }}
        >
          {t("action.cancel")}
        </Button>

        <Button
          type="primary"
          icon={<SendOutlined />}
          disabled={!validationResult.isValid || disabled}
          onClick={handleSend}
          style={{
            flex: 1.5,
            borderRadius: "6px",
            background: !validationResult.isValid ? "#93c5fd" : primaryColor,
            borderColor: !validationResult.isValid ? "#93c5fd" : primaryColor,
            color: "#ffffff",
            fontWeight: 500,
            height: "32px",
          }}
        >
          {t("action.send")}
        </Button>
      </div>
    </div>
  );
}
