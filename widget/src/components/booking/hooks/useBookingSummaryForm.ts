import { useState, useMemo, useCallback, useEffect } from "react";
import {
  AsYouType,
  type CountryCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
import type {
  BookingResourceItem,
  BookingServiceItem,
  BookingSummaryPayload,
} from "../../../store";
import {
  calculateSlotEndTime,
  buildSequentialSlotTimes,
} from "../../../utils/booking-time.utils";
import { validateAndFormatPhoneNumber } from "../../../utils/phone-validator.utils";

export interface CountryOption {
  code: CountryCode;
  label: string;
  flag: string;
  dialCode: string;
}

export interface EditableSlotItem {
  id: string;
  date: string;
  timeSlot: string;
  resourceId?: string;
  serviceId?: string;
  notes?: string;
}

export const PHONE_COUNTRIES: CountryOption[] = [
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

export interface UseBookingSummaryFormProps {
  payload: BookingSummaryPayload;
  onSave: (payload: BookingSummaryPayload) => void;
  siteId?: string;
  backendUrl?: string;
  bookingServices?: BookingServiceItem[];
  bookingResources?: BookingResourceItem[];
  slotDuration: number;
  isGeneral: boolean;
}

export function useBookingSummaryForm({
  payload,
  onSave,
  siteId,
  backendUrl,
  bookingServices = [],
  bookingResources = [],
  slotDuration,
  isGeneral,
}: UseBookingSummaryFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(payload.customerName || "");
  const [editPhone, setEditPhone] = useState(payload.phone || "");
  const [editPhoneCountry, setEditPhoneCountry] = useState<CountryCode>("VN");
  const [editEmail, setEditEmail] = useState(payload.customerEmail || "");
  const [editSlots, setEditSlots] = useState<EditableSlotItem[]>([]);
  const [activeSlotTabIndex, setActiveSlotTabIndex] = useState<string>("0");
  const [slotsCache, setSlotsCache] = useState<Record<string, string[]>>({});
  const [loadingCacheKey, setLoadingCacheKey] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  const isPhoneValid = useMemo(() => {
    const trimmed = editPhone.trim();
    if (!trimmed) return false;
    return validateAndFormatPhoneNumber(trimmed, editPhoneCountry).isValid;
  }, [editPhone, editPhoneCountry]);

  const isEmailValid = useMemo(() => {
    const trimmed = editEmail.trim();
    if (!trimmed) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  }, [editEmail]);

  const fetchSlotsForSlotParams = useCallback(
    async (date: string, resourceId?: string, serviceId?: string) => {
      const resolvedSiteId =
        siteId ||
        (window as unknown as { EzChatConfig?: { siteId?: string } })
          ?.EzChatConfig?.siteId ||
        (typeof document !== "undefined"
          ? (
              document.querySelector(
                "script[data-site-id]",
              ) as HTMLScriptElement | null
            )?.dataset.siteId
          : "") ||
        "";
      if (!date || !resolvedSiteId) return [];

      const cacheKey = `${date}|${resourceId || ""}|${serviceId || ""}`;
      if (slotsCache[cacheKey]) {
        return slotsCache[cacheKey];
      }

      setLoadingCacheKey(cacheKey);
      try {
        const bUrl =
          backendUrl ||
          (window as unknown as { EzChatConfig?: { backendUrl?: string } })
            .EzChatConfig?.backendUrl ||
          "http://localhost:3000";

        const queryParams = new URLSearchParams({ date });
        if (resourceId && resourceId.trim()) {
          queryParams.set("resourceId", resourceId.trim());
        }
        if (serviceId && serviceId.trim() && serviceId !== "undefined") {
          queryParams.set("serviceId", serviceId.trim());
        }

        const res = await fetch(
          `${bUrl}/api/v1/sites/public/${resolvedSiteId}/available-slots?${queryParams.toString()}`,
        );
        if (!res.ok) throw new Error("Failed to fetch slots");
        const data = await res.json();
        const slots: Array<{ timeSlot: string; available?: boolean }> =
          data.slots || [];
        const freeSlots = slots
          .filter((s) => s.available !== false)
          .map((s) => s.timeSlot);

        setSlotsCache((prev) => ({ ...prev, [cacheKey]: freeSlots }));
        return freeSlots;
      } catch (err) {
        console.error("Error fetching slots in edit mode", err);
        return [];
      } finally {
        setLoadingCacheKey(null);
      }
    },
    [siteId, backendUrl, slotsCache],
  );

  useEffect(() => {
    if (!isEditing || editSlots.length === 0) return;
    editSlots.forEach((slot) => {
      if (slot.date) {
        void fetchSlotsForSlotParams(
          slot.date,
          slot.resourceId,
          slot.serviceId,
        );
      }
    });
  }, [isEditing, editSlots, fetchSlotsForSlotParams]);

  const getResolvedServiceId = useCallback(
    (serviceIdOrName?: string, fallbackServiceName?: string) => {
      if (!serviceIdOrName && !fallbackServiceName) return undefined;
      const primaryTarget = (serviceIdOrName || fallbackServiceName || "")
        .split(",")[0]
        ?.trim();
      if (!primaryTarget) return undefined;

      const match = bookingServices.find(
        (s) =>
          (s.id && s.id.toLowerCase() === primaryTarget.toLowerCase()) ||
          (s.name && s.name.toLowerCase() === primaryTarget.toLowerCase()),
      );
      if (match) return match.id || match.name;

      if (fallbackServiceName && fallbackServiceName !== serviceIdOrName) {
        const fallbackTarget = fallbackServiceName.split(",")[0]?.trim();
        const fallbackMatch = bookingServices.find(
          (s) =>
            (s.id && s.id.toLowerCase() === fallbackTarget.toLowerCase()) ||
            (s.name && s.name.toLowerCase() === fallbackTarget.toLowerCase()),
        );
        if (fallbackMatch) return fallbackMatch.id || fallbackMatch.name;
      }

      return primaryTarget;
    },
    [bookingServices],
  );

  const getResolvedResourceId = useCallback(
    (resourceIdOrName?: string, fallbackStaffName?: string) => {
      if (!resourceIdOrName && !fallbackStaffName) return undefined;
      const primaryTarget = (resourceIdOrName || fallbackStaffName || "")
        .split(",")[0]
        ?.trim();
      if (!primaryTarget) return undefined;

      const match = bookingResources.find(
        (r) =>
          (r.id && r.id.toLowerCase() === primaryTarget.toLowerCase()) ||
          (r.name && r.name.toLowerCase() === primaryTarget.toLowerCase()),
      );
      if (match) return match.id || match.name;

      if (fallbackStaffName && fallbackStaffName !== resourceIdOrName) {
        const fallbackTarget = fallbackStaffName.split(",")[0]?.trim();
        const fallbackMatch = bookingResources.find(
          (r) =>
            (r.id && r.id.toLowerCase() === fallbackTarget.toLowerCase()) ||
            (r.name && r.name.toLowerCase() === fallbackTarget.toLowerCase()),
        );
        if (fallbackMatch) return fallbackMatch.id || fallbackMatch.name;
      }

      return primaryTarget;
    },
    [bookingResources],
  );

  const handleStartEdit = () => {
    setEditName(payload.customerName || "");
    setEditPhone(payload.phone || "");
    setEditEmail(payload.customerEmail || "");

    let serviceIdList: string[] = [];
    if (payload.serviceIds && payload.serviceIds.length > 0) {
      serviceIdList = payload.serviceIds
        .flatMap((s) => (s ? s.split(",") : []))
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (payload.serviceId) {
      serviceIdList = payload.serviceId
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    let serviceNameList: string[] = [];
    if (payload.serviceNames && payload.serviceNames.length > 0) {
      serviceNameList = payload.serviceNames
        .flatMap((s) => (s ? s.split(",") : []))
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (payload.serviceName) {
      serviceNameList = payload.serviceName
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    let resourceIdList: string[] = [];
    if (payload.resourceId) {
      resourceIdList = payload.resourceId
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
    }

    let initialSlots: EditableSlotItem[] = [];
    if (payload.slots && payload.slots.length > 0) {
      const sortedPayloadSlots = [...payload.slots].sort((a, b) => {
        const dc = (a.date || "").localeCompare(b.date || "");
        if (dc !== 0) return dc;
        return (a.timeSlot || "").localeCompare(b.timeSlot || "");
      });

      initialSlots = sortedPayloadSlots.map((s, idx) => {
        const rawServiceId =
          s.serviceId ||
          serviceIdList[idx] ||
          serviceIdList[0] ||
          payload.serviceId;
        const rawServiceName =
          s.serviceName ||
          serviceNameList[idx] ||
          serviceNameList[0] ||
          payload.serviceName;
        const resolvedServiceId =
          getResolvedServiceId(rawServiceId, rawServiceName) ||
          (!isGeneral
            ? bookingServices[idx % Math.max(1, bookingServices.length)]?.id ||
              bookingServices[0]?.name
            : undefined);

        const resolvedResourceId =
          getResolvedResourceId(
            s.resourceId ||
              resourceIdList[idx] ||
              resourceIdList[0] ||
              payload.resourceId,
            s.staffName || s.resourceName || payload.resourceName,
          ) ||
          (!isGeneral
            ? bookingResources[idx % Math.max(1, bookingResources.length)]
                ?.id || bookingResources[0]?.name
            : undefined);

        return {
          id: `slot-${idx}-${Date.now()}`,
          date: s.date || payload.date || todayStr,
          timeSlot: s.timeSlot || payload.timeSlot || "",
          resourceId: resolvedResourceId,
          serviceId: resolvedServiceId,
          notes: s.notes,
        };
      });
    } else {
      const count = Math.max(
        1,
        payload.slotCount ||
          (serviceIdList.length > 0 ? serviceIdList.length : 1),
      );
      const sequentialTimes = buildSequentialSlotTimes(
        payload.timeSlot || "09:00",
        count,
        slotDuration,
      );
      for (let i = 0; i < count; i++) {
        const tStr = sequentialTimes[i] || payload.timeSlot || "";
        const rawServiceId =
          serviceIdList[i] || serviceIdList[0] || payload.serviceId;
        const rawServiceName =
          serviceNameList[i] || serviceNameList[0] || payload.serviceName;
        const resolvedServiceId =
          getResolvedServiceId(rawServiceId, rawServiceName) ||
          (!isGeneral
            ? bookingServices[i % Math.max(1, bookingServices.length)]?.id ||
              bookingServices[0]?.name
            : undefined);

        const resolvedResourceId =
          getResolvedResourceId(
            resourceIdList[i] || resourceIdList[0] || payload.resourceId,
            payload.resourceName,
          ) ||
          (!isGeneral
            ? bookingResources[i % Math.max(1, bookingResources.length)]?.id ||
              bookingResources[0]?.name
            : undefined);

        initialSlots.push({
          id: `slot-${i}-${Date.now()}`,
          date: payload.date || todayStr,
          timeSlot: tStr,
          resourceId: resolvedResourceId,
          serviceId: resolvedServiceId,
        });
      }
    }

    setEditSlots(initialSlots);
    setActiveSlotTabIndex("0");

    if (payload.phone) {
      try {
        const parsed = parsePhoneNumberFromString(payload.phone);
        if (parsed?.country) {
          setEditPhoneCountry(parsed.country);
          setEditPhone(parsed.nationalNumber);
        } else {
          setEditPhone(payload.phone);
        }
      } catch {
        setEditPhone(payload.phone);
      }
    }

    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handlePhoneCountryChange = (country: CountryCode) => {
    setEditPhoneCountry(country);
    if (editPhone.trim()) {
      try {
        const formatter = new AsYouType(country);
        const digits = editPhone.replace(/\D/g, "");
        const formatted = formatter.input(digits);
        setEditPhone(formatted);
      } catch {
        // keep current
      }
    }
  };

  const handlePhoneInputChange = (rawVal: string) => {
    try {
      const formatter = new AsYouType(editPhoneCountry);
      const digits = rawVal.replace(/\D/g, "");
      const formatted = formatter.input(digits);
      setEditPhone(formatted);
    } catch {
      setEditPhone(rawVal);
    }
  };

  const handleSlotChange = (
    index: number,
    field: keyof EditableSlotItem,
    value: string | undefined,
  ) => {
    setEditSlots((prev) => {
      const next = [...prev];
      const targetSlot = { ...next[index], [field]: value };
      if (field === "date" || field === "resourceId" || field === "serviceId") {
        if (targetSlot.date) {
          void fetchSlotsForSlotParams(
            targetSlot.date,
            targetSlot.resourceId,
            targetSlot.serviceId,
          );
        }
      }
      next[index] = targetSlot;
      return next;
    });
  };

  const handleAddSlot = () => {
    const lastSlot = editSlots[editSlots.length - 1];
    const newDate = lastSlot?.date || payload.date || todayStr;
    const newTime = lastSlot?.timeSlot
      ? calculateSlotEndTime(lastSlot.timeSlot, slotDuration)
      : "09:00";
    const newServiceId =
      lastSlot?.serviceId || bookingServices[0]?.id || bookingServices[0]?.name;
    const newResourceId =
      lastSlot?.resourceId ||
      bookingResources[0]?.id ||
      bookingResources[0]?.name;

    const newSlotItem: EditableSlotItem = {
      id: `slot-${editSlots.length}-${Date.now()}`,
      date: newDate,
      timeSlot: newTime,
      serviceId: newServiceId,
      resourceId: newResourceId,
    };

    setEditSlots((prev) => [...prev, newSlotItem]);
    setActiveSlotTabIndex(String(editSlots.length));
  };

  const handleRemoveSlot = (index: number) => {
    if (editSlots.length <= 1) return;
    setEditSlots((prev) => prev.filter((_, i) => i !== index));
    setActiveSlotTabIndex((prev) => {
      const pIdx = Number(prev);
      if (pIdx >= editSlots.length - 1) {
        return String(Math.max(0, editSlots.length - 2));
      }
      return prev;
    });
  };

  const handleApplyFirstToAll = (
    field: "date" | "resourceId" | "serviceId",
  ) => {
    const firstVal = editSlots[0]?.[field];
    if (firstVal === undefined) return;
    setEditSlots((prev) =>
      prev.map((s, idx) => {
        if (idx === 0) return s;
        const updated = { ...s, [field]: firstVal };
        if (updated.date) {
          void fetchSlotsForSlotParams(
            updated.date,
            updated.resourceId,
            updated.serviceId,
          );
        }
        return updated;
      }),
    );
  };

  const isFormValid = useMemo(() => {
    if (!editName.trim()) return false;
    if (!isPhoneValid) return false;
    if (!isEmailValid) return false;
    if (editSlots.length === 0) return false;
    for (const slot of editSlots) {
      if (!slot.date || !slot.timeSlot) return false;
    }
    return true;
  }, [editName, isPhoneValid, isEmailValid, editSlots]);

  const handleSaveChanges = () => {
    if (!isFormValid) return;

    const phoneValidation = validateAndFormatPhoneNumber(
      editPhone.trim(),
      editPhoneCountry,
    );
    const finalPhone = phoneValidation.isValid
      ? phoneValidation.formattedNumber
      : editPhone.trim();

    const sortedEditSlots = [...editSlots].sort((a, b) => {
      const dc = (a.date || "").localeCompare(b.date || "");
      if (dc !== 0) return dc;
      return (a.timeSlot || "").localeCompare(b.timeSlot || "");
    });

    const lastSlot = sortedEditSlots[sortedEditSlots.length - 1];
    let calculatedEndTimeSlot = "";
    if (lastSlot?.timeSlot) {
      calculatedEndTimeSlot = calculateSlotEndTime(
        lastSlot.timeSlot,
        slotDuration,
      );
    }

    const updatedSlots = sortedEditSlots.map((slot) => {
      const sName =
        bookingServices.find(
          (s) => s.id === slot.serviceId || s.name === slot.serviceId,
        )?.name || payload.serviceName;
      const stName =
        bookingResources.find(
          (r) => r.id === slot.resourceId || r.name === slot.resourceId,
        )?.name || payload.resourceName;
      return {
        resourceId: slot.resourceId,
        date: slot.date,
        timeSlot: slot.timeSlot,
        serviceId: slot.serviceId,
        serviceName: sName,
        staffName: stName,
        resourceName: stName,
        notes: slot.notes,
      };
    });

    const updatedServiceIds = updatedSlots
      .map((s) => s.serviceId)
      .filter((id): id is string => Boolean(id && id.trim()));
    const updatedServiceNames = updatedSlots
      .map((s) => s.serviceName)
      .filter((name): name is string => Boolean(name && name.trim()));
    const updatedResourceIds = updatedSlots
      .map((s) => s.resourceId)
      .filter((id): id is string => Boolean(id && id.trim()));
    const updatedResourceNames = updatedSlots
      .map((s) => s.staffName || s.resourceName)
      .filter((name): name is string => Boolean(name && name.trim()));

    const customPayload: BookingSummaryPayload = {
      ...payload,
      customerName: editName.trim(),
      phone: finalPhone,
      customerEmail: editEmail.trim() || undefined,
      serviceId: updatedServiceIds[0] || payload.serviceId,
      serviceIds:
        updatedServiceIds.length > 0 ? updatedServiceIds : payload.serviceIds,
      serviceName: updatedServiceNames[0] || payload.serviceName,
      serviceNames:
        updatedServiceNames.length > 0
          ? updatedServiceNames
          : payload.serviceNames,
      resourceId: updatedResourceIds[0] || payload.resourceId,
      resourceName: updatedResourceNames[0] || payload.resourceName,
      date: sortedEditSlots[0]?.date || payload.date,
      timeSlot: sortedEditSlots[0]?.timeSlot || payload.timeSlot,
      endTimeSlot: calculatedEndTimeSlot || payload.endTimeSlot,
      slotCount: sortedEditSlots.length,
      slots: updatedSlots,
      previousSlot: {
        date: payload.date,
        timeSlot: payload.timeSlot,
        sessionId: payload.sessionId,
        slots: payload.slots,
      },
    };

    setIsEditing(false);
    onSave(customPayload);
  };

  return {
    isEditing,
    editName,
    setEditName,
    editPhone,
    editPhoneCountry,
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
    handleStartEdit,
    handleCancelEdit,
    handlePhoneCountryChange,
    handlePhoneInputChange,
    handleSlotChange,
    handleAddSlot,
    handleRemoveSlot,
    handleApplyFirstToAll,
    handleSaveChanges,
    fetchSlotsForSlotParams,
  };
}
