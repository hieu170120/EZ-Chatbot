import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  useVisitorChatStore,
  type BookingResourceItem,
  type BookingServiceItem,
  type BookingSummaryPayload,
} from "../../store";
import {
  calculateMultiSlotEndTime,
  calculateSlotEndTime,
  formatSlotRanges,
  buildSequentialSlotTimes,
  getEffectiveSlotDuration,
} from "../../utils/booking-time.utils";
import { useBookingSummaryForm } from "./hooks/useBookingSummaryForm";
import { BookingSummaryView } from "./BookingSummaryView";
import { BookingSummaryEditor } from "./BookingSummaryEditor";
import { useWidgetConfig } from "../../context/WidgetContext";

export interface BookingSummaryCardProps {
  payload: BookingSummaryPayload;
  onSave: (payload: BookingSummaryPayload) => void;
  onConfirm: () => void;
  onCancel?: () => void;
  onEdit?: () => void;
  primaryColor?: string;
  disabled?: boolean;
  siteId?: string;
  backendUrl?: string;
  bookingServices?: BookingServiceItem[];
  bookingResources?: BookingResourceItem[];
}

export function BookingSummaryCard({
  payload,
  onSave,
  onConfirm,
  onCancel,
  onEdit,
  primaryColor,
  disabled,
  siteId: siteIdProp,
  backendUrl: backendUrlProp,
  bookingServices: bookingServicesProp,
  bookingResources: bookingResourcesProp,
}: BookingSummaryCardProps) {
  const contextConfig = useWidgetConfig();
  const siteId = siteIdProp || contextConfig.siteId;
  const backendUrl = backendUrlProp || contextConfig.backendUrl;

  const storeServices = useVisitorChatStore((s) => s.bookingServices);
  const storeResources = useVisitorChatStore((s) => s.bookingResources);
  const bookingServices = useMemo(
    () => bookingServicesProp || storeServices || [],
    [bookingServicesProp, storeServices],
  );
  const bookingResources = useMemo(
    () => bookingResourcesProp || storeResources || [],
    [bookingResourcesProp, storeResources],
  );

  const { t } = useTranslation("booking", { lng: payload.locale || "en" });

  const configuredSlotDuration = useVisitorChatStore(
    (s) => s.bookingHours?.slotDuration,
  );
  const slotDuration = getEffectiveSlotDuration(configuredSlotDuration);

  const industryTemplate = useVisitorChatStore((s) => s.industryTemplate);
  const isGeneral = industryTemplate !== null && industryTemplate !== "salon";

  const form = useBookingSummaryForm({
    payload,
    onSave,
    siteId,
    backendUrl,
    bookingServices,
    bookingResources,
    slotDuration,
    isGeneral,
  });

  const text = {
    title: t("summary.title"),
    service: t("field.service"),
    staff: t("field.staff"),
    name: t("field.name"),
    phone: t("field.phone"),
    email: t("field.email"),
    date: t("field.date"),
    time: t("field.time"),
    confirm: t("action.confirm"),
    edit: t("action.edit"),
    cancel: t("action.cancel"),
    saveChanges: t("action.saveChanges"),
    empty: t("field.empty"),
    invalidPhone: t("summary.invalidPhone"),
    invalidEmail: t("summary.invalidEmail"),
    required: t("summary.requiredField"),
    optional: t("field.optional"),
    selectStaff: t("summary.selectStaff"),
    selectService: t("summary.selectService"),
    selectTime: t("summary.selectTime"),
    noSlots: t("summary.noSlots"),
    loadingSlots: t("summary.loadingSlots"),
    slotSchedule: t("summary.slotSchedule"),
    slot: t("summary.slot"),
    addSlot: t("summary.addSlot") || "Add slot",
    applyToAllSlots:
      t("summary.applyToAllSlots") || "Apply date & staff to all",
    removeSlot: t("summary.removeSlot") || "Remove slot",
    slotsCount: t("summary.slotsCount"),
    slotItem: t("summary.slotItem"),
  };

  const getResolvedServiceId = (idOrName?: string) => {
    if (!idOrName) return undefined;
    const match = bookingServices.find(
      (s) =>
        (s.id && s.id.toLowerCase() === idOrName.toLowerCase()) ||
        (s.name && s.name.toLowerCase() === idOrName.toLowerCase()),
    );
    return match?.id || match?.name || idOrName;
  };

  const getResolvedResourceId = (idOrName?: string) => {
    if (!idOrName) return undefined;
    const match = bookingResources.find(
      (r) =>
        (r.id && r.id.toLowerCase() === idOrName.toLowerCase()) ||
        (r.name && r.name.toLowerCase() === idOrName.toLowerCase()),
    );
    return match?.id || match?.name || idOrName;
  };

  const mergedSchedule = useMemo(() => {
    const rawSlots = payload.slots;
    if (Array.isArray(rawSlots) && rawSlots.length > 0) {
      const sortedSlots = [...rawSlots].sort((a, b) => {
        const dc = (a.date || "").localeCompare(b.date || "");
        if (dc !== 0) return dc;
        return (a.timeSlot || "").localeCompare(b.timeSlot || "");
      });

      const schedule: Array<{
        serviceName: string;
        date?: string;
        startTime: string;
        endTime: string;
        slotCount: number;
        staffName?: string;
      }> = [];
      let current: (typeof schedule)[0] | null = null;

      sortedSlots.forEach((slot) => {
        const sName =
          slot.serviceName ||
          (slot.serviceId
            ? bookingServices.find(
                (s) => s.id === slot.serviceId || s.name === slot.serviceId,
              )?.name || slot.serviceId
            : "") ||
          payload.serviceName ||
          "";
        const stName =
          slot.staffName ||
          slot.resourceName ||
          (slot.resourceId
            ? bookingResources.find(
                (r) => r.id === slot.resourceId || r.name === slot.resourceId,
              )?.name || slot.resourceId
            : "") ||
          payload.resourceName ||
          "";
        const slotDate = slot.date || payload.date;
        const slotStart = slot.timeSlot || "";
        const slotEnd = slotStart
          ? calculateSlotEndTime(slotStart, slotDuration)
          : "";
        if (
          current &&
          current.serviceName === sName &&
          current.date === slotDate &&
          current.staffName === stName &&
          current.endTime === slotStart
        ) {
          current.slotCount += 1;
          current.endTime = slotEnd;
        } else {
          current = {
            serviceName: sName,
            date: slotDate,
            startTime: slotStart,
            endTime: slotEnd,
            slotCount: 1,
            staffName: stName || undefined,
          };
          schedule.push(current);
        }
      });
      return schedule;
    }

    if (
      Array.isArray(payload.serviceNames) &&
      payload.serviceNames.length > 0 &&
      payload.timeSlot
    ) {
      const schedule: Array<{
        serviceName: string;
        date?: string;
        startTime: string;
        endTime: string;
        slotCount: number;
        staffName?: string;
      }> = [];
      let current: (typeof schedule)[0] | null = null;
      const sequentialTimes = buildSequentialSlotTimes(
        payload.timeSlot,
        payload.serviceNames.length,
        slotDuration,
      );
      payload.serviceNames.forEach((sName, idx) => {
        const slotStart = sequentialTimes[idx] || "";
        const slotEnd = calculateSlotEndTime(slotStart, slotDuration);
        if (current && current.serviceName === sName) {
          current.slotCount += 1;
          current.endTime = slotEnd;
        } else {
          current = {
            serviceName: sName,
            date: payload.date,
            startTime: slotStart,
            endTime: slotEnd,
            slotCount: 1,
            staffName: payload.resourceName || undefined,
          };
          schedule.push(current);
        }
      });
      return schedule;
    }

    return [];
  }, [
    payload.slots,
    payload.serviceNames,
    payload.serviceName,
    payload.resourceName,
    payload.timeSlot,
    payload.date,
    bookingServices,
    bookingResources,
    slotDuration,
  ]);

  const formattedTimeDisplay = useMemo(() => {
    if (payload.slots && payload.slots.length > 0) {
      const ranges = formatSlotRanges(payload.slots, slotDuration);
      if (ranges) return ranges;
    }

    if (payload.endTimeSlot) {
      return `${payload.timeSlot} - ${payload.endTimeSlot}`;
    }

    if (payload.timeSlot) {
      const count = payload.slotCount || 1;
      const end = calculateMultiSlotEndTime(
        payload.timeSlot,
        count,
        slotDuration,
      );
      return `${payload.timeSlot} - ${end}`;
    }

    return text.empty;
  }, [
    payload.slots,
    payload.timeSlot,
    payload.endTimeSlot,
    payload.slotCount,
    slotDuration,
    text.empty,
  ]);

  const formattedDateDisplay = useMemo(() => {
    if (payload.slots && payload.slots.length > 0) {
      const dates = Array.from(
        new Set(payload.slots.map((s) => s.date).filter(Boolean)),
      );
      if (dates.length > 0) return dates.join(", ");
    }
    return payload.date || text.empty;
  }, [payload.slots, payload.date, text.empty]);

  const formattedServiceDisplay = useMemo(() => {
    if (payload.serviceNames && payload.serviceNames.length > 0) {
      const uniqueNames = Array.from(new Set(payload.serviceNames));
      return uniqueNames.join(", ");
    }
    if (payload.slots && payload.slots.length > 0) {
      const sNames = Array.from(
        new Set(
          payload.slots
            .map(
              (s) =>
                s.serviceName ||
                bookingServices.find(
                  (bs) => bs.id === s.serviceId || bs.name === s.serviceId,
                )?.name,
            )
            .filter((n): n is string => Boolean(n && n.trim())),
        ),
      );
      if (sNames.length > 0) return sNames.join(", ");
    }
    return payload.serviceName || text.empty;
  }, [
    payload.serviceNames,
    payload.slots,
    payload.serviceName,
    bookingServices,
    text.empty,
  ]);

  const formattedResourceDisplay = useMemo(() => {
    if (payload.slots && payload.slots.length > 0) {
      const rNames = Array.from(
        new Set(
          payload.slots
            .map(
              (s) =>
                s.staffName ||
                s.resourceName ||
                bookingResources.find(
                  (br) => br.id === s.resourceId || br.name === s.resourceId,
                )?.name,
            )
            .filter((n): n is string => Boolean(n && n.trim())),
        ),
      );
      if (rNames.length > 0) return rNames.join(", ");
    }
    return payload.resourceName || text.empty;
  }, [payload.slots, payload.resourceName, bookingResources, text.empty]);

  if (form.isEditing) {
    return (
      <BookingSummaryEditor
        text={text}
        editName={form.editName}
        setEditName={form.setEditName}
        editPhone={form.editPhone}
        editPhoneCountry={form.editPhoneCountry}
        setEditPhoneCountry={form.handlePhoneCountryChange}
        editEmail={form.editEmail}
        setEditEmail={form.setEditEmail}
        editSlots={form.editSlots}
        activeSlotTabIndex={form.activeSlotTabIndex}
        setActiveSlotTabIndex={form.setActiveSlotTabIndex}
        slotsCache={form.slotsCache}
        loadingCacheKey={form.loadingCacheKey}
        isPhoneValid={form.isPhoneValid}
        isEmailValid={form.isEmailValid}
        isFormValid={form.isFormValid}
        bookingServices={bookingServices}
        bookingResources={bookingResources}
        isGeneral={isGeneral}
        primaryColor={primaryColor}
        onPhoneChange={form.handlePhoneInputChange}
        onSlotUpdate={form.handleSlotChange}
        onAddSlot={form.handleAddSlot}
        onRemoveSlot={form.handleRemoveSlot}
        onApplyFirstToAll={form.handleApplyFirstToAll}
        onCancel={form.handleCancelEdit}
        onSave={form.handleSaveChanges}
        getResolvedServiceId={getResolvedServiceId}
        getResolvedResourceId={getResolvedResourceId}
      />
    );
  }

  return (
    <BookingSummaryView
      payload={payload}
      text={text}
      formattedServiceDisplay={formattedServiceDisplay}
      formattedResourceDisplay={formattedResourceDisplay}
      formattedDateDisplay={formattedDateDisplay}
      formattedTimeDisplay={formattedTimeDisplay}
      mergedSchedule={mergedSchedule}
      disabled={disabled}
      primaryColor={primaryColor}
      onStartEdit={() => {
        form.handleStartEdit();
        onEdit?.();
      }}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
