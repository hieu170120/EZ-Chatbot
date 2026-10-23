import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { submitMessageFeedbackApi } from "./api/chat.api";
import { resolveWidgetConfig } from "./config/widget-config";

export const getBackendUrl = (): string => {
  return resolveWidgetConfig().backendUrl;
};

export type ChatRole = "bot" | "agent" | "user" | "system";
export type HandlingStatus =
  "AI_HANDLING" | "WAITING_FOR_AGENT" | "AGENT_HANDLING";

export type MessageStatusType = "queued" | "SENT" | "DELIVERED" | "READ";
export type FeedbackRating = "HELPFUL" | "UNHELPFUL";

export type BookingChipAction =
  | "select_booking_type"
  | "select_party_size"
  | "select_service"
  | "select_resource"
  | "select_date"
  | "choose_date"
  | "no_preference"
  | "skip_email"
  | "submit_text"
  | "assign_remaining_service"
  | "cancel_booking"
  | "keep_booking";

export type BookingChipItem = {
  action: BookingChipAction;
  value?: string;
  values?: string[];
  label?: string;
  labels?: string[];
  labelKey?: string;
  labelParams?: Record<string, string | number>;
};

export type ChatMessageComponent = {
  type: "chips";
  items: BookingChipItem[];
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt?: string;
  status?: MessageStatusType;
  senderName?: string | null;
  locale?: string;
  components?: ChatMessageComponent[];
  bookingSuccess?: BookingSuccessPayload;
  feedbackRating?: FeedbackRating;
};

export type BookingResourceOption = {
  resourceId: string;
  resourceName: string;
};

export type BookingSlot = {
  slotId?: string;
  date: string;
  timeSlot: string;
  resourceId?: string;
  resourceName?: string;
  availableResources?: BookingResourceOption[];
  available: boolean;
};

export type BookingSummarySlot = {
  resourceId?: string;
  resourceName?: string;
  staffName?: string;
  date?: string;
  timeSlot?: string;
  serviceId?: string;
  serviceName?: string;
  notes?: string;
};

export type BookingSummaryPayload = {
  locale?: string;
  customerName?: string;
  customerEmail?: string;
  saveChangesLabel?: string;
  phone?: string;
  serviceId?: string;
  serviceIds?: string[];
  serviceName?: string;
  serviceNames?: string[];
  resourceId?: string;
  resourceName?: string;
  date?: string;
  timeSlot?: string;
  endTimeSlot?: string;
  slotCount?: number;
  sessionId?: string;
  slots?: BookingSummarySlot[];
  previousSlot?: {
    resourceId?: string;
    date?: string;
    timeSlot?: string;
    sessionId?: string;
    slots?: BookingSummarySlot[];
  };
};

export type BookingSuccessPayload = BookingSummaryPayload & {
  bookingCode?: string;
  status?: string;
  createdAt?: string;
};

export type BookingCancellationPayload = BookingSummaryPayload & {
  bookingCode: string;
  status?: string;
  locale?: string;
};

export type BookingSlotsPayload = BookingSlot[] | { slots?: BookingSlot[] };

const clearsActiveSlots = (message: ChatMessage) =>
  message.role === "user" ||
  /\b(name|phone|confirm|summary)\b/i.test(message.text);

export type TimeoutSettings = {
  enableConversationTimeout?: boolean;
  inactivityTimeoutMinutes?: number;
  warningTimeMinutes?: number;
  inactivityWarningMessage?: string;
  timeoutMessage?: string;
  resetTimerOnBotResponse?: boolean;
  pauseTimerForAgentChats?: boolean;
};

export type AppearanceSettings = {
  primaryColor?: string | null;
  backgroundColor?: string | null;
  botAvatar?: string | null;
  launcherIcon?: string | null;
  defaultGreetingMessage?: string | null;
  chatButtonPosition?: string;
  chatWindowTitle?: string | null;
  chatButtonText?: string | null;
  showAvatar?: boolean;
};

export type BookingServiceItem = {
  id: string;
  name: string;
};

export type BookingResourceItem = {
  id: string;
  name: string;
};

export type BookingHours = {
  timezone?: string | null;
  availableDays?: number[];
  startTime?: string;
  endTime?: string;
  slotDuration?: number;
};

type VisitorChatStore = {
  conversationId: string | null;
  visitorToken: string | null;
  visitorName: string;
  visitorEmail: string;
  siteName: string | null;
  unreadCount: number;
  isUserAtBottom: boolean;
  messages: ChatMessage[];
  status: "OPEN" | "PAUSED" | "CLOSED";
  isClosing: boolean;
  isAgentTyping: boolean;
  timeoutSettings: TimeoutSettings | null;
  appearanceSettings: AppearanceSettings | null;
  bookingHours: BookingHours | null;
  bookingServices: BookingServiceItem[];
  bookingResources: BookingResourceItem[];
  lastActivityAt: number | null;
  previewImages: string[];
  previewIndex: number;

  // Feature flags (feature/config-site/huyen)
  isAiActive: boolean;
  humanHandoff: boolean;
  emailTranscript: boolean;
  useCurrentPageContent: boolean;
  setFeatureFlags: (flags: {
    isAiActive?: boolean;
    humanHandoff?: boolean;
    emailTranscript?: boolean;
    useCurrentPageContent?: boolean;
  }) => void;

  // Message feedback (sprint4)
  setMessageFeedback: (messageId: string, rating: FeedbackRating) => void;
  submitMessageFeedback: (
    messageId: string,
    rating: FeedbackRating,
  ) => Promise<void>;

  // Booking UI States
  activeBookingSlots: BookingSlotsPayload | null;
  activeBookingSummary: BookingSummaryPayload | null;
  draftBookingSummary: BookingSummaryPayload | null;
  activeBookingSuccess: BookingSuccessPayload | null;
  activeBookingCancellation: BookingCancellationPayload | null;
  cancelledBookingCodes: string[];
  bookingType: "single" | "multiple" | null;
  partySize: number | null;
  selectedBookingSlots: Array<{
    timeSlot: string;
    date?: string;
    resourceId?: string;
    resourceName?: string;
  }>;
  selectedBookingServiceIds: string[];

  setPreview: (images: string[], index: number) => void;
  closePreview: () => void;

  setBookingSlots: (payload: BookingSlotsPayload | null) => void;
  setBookingSummary: (payload: BookingSummaryPayload | null) => void;
  beginBookingSummaryEdit: () => void;
  setBookingSuccess: (payload: BookingSuccessPayload | null) => void;
  addBookingSuccess: (payload: BookingSuccessPayload) => void;
  setBookingCancellation: (payload: BookingCancellationPayload | null) => void;
  markBookingCancelled: (payload: BookingCancellationPayload) => void;
  setBookingType: (type: "single" | "multiple" | null) => void;
  setPartySize: (size: number | null) => void;
  setSelectedBookingSlots: (
    slots: Array<{
      timeSlot: string;
      date?: string;
      resourceId?: string;
      resourceName?: string;
    }>,
  ) => void;
  setSelectedBookingServiceIds: (ids: string[]) => void;

  setSiteName: (name: string) => void;
  incrementUnreadCount: () => void;
  resetUnreadCount: () => void;
  setIsUserAtBottom: (val: boolean) => void;
  setConversationId: (id: string | null) => void;
  setVisitorToken: (token: string | null) => void;
  setVisitorInfo: (name: string, email: string) => void;
  setStatus: (status: "OPEN" | "PAUSED" | "CLOSED") => void;
  setIsClosing: (isClosing: boolean) => void;
  setTimeoutSettings: (settings: TimeoutSettings) => void;
  setAppearanceSettings: (settings: AppearanceSettings) => void;
  setBookingHours: (hours: BookingHours | null) => void;
  setBookingServices: (services: BookingServiceItem[]) => void;
  setBookingResources: (resources: BookingResourceItem[]) => void;
  industryTemplate: string | null;
  setIndustryTemplate: (template: string | null) => void;
  updateLastActivityAt: (timestamp?: number) => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  updateMessageStatus: (id: string, status: MessageStatusType) => void;
  appendMessageChunk: (id: string, chunk: string) => void;
  removeMessage: (id: string) => void;
  updateMessagesStatusByRole: (
    role: ChatRole,
    status: MessageStatusType,
    conditionStatus?: MessageStatusType[],
  ) => void;
  hasMoreMessages: boolean;
  isLoadingMoreMessages: boolean;
  setHasMoreMessages: (hasMore: boolean) => void;
  setIsLoadingMoreMessages: (loading: boolean) => void;
  prependMessages: (olderMessages: ChatMessage[]) => void;
  setAgentTyping: (isTyping: boolean) => void;
  clearStore: () => void;
};

export const useVisitorChatStore = create<VisitorChatStore>()(
  persist(
    (set, get) => ({
      conversationId: null,
      visitorToken: null,
      visitorName: "",
      visitorEmail: "",
      siteName: null,
      unreadCount: 0,
      isUserAtBottom: true,
      messages: [],
      hasMoreMessages: false,
      isLoadingMoreMessages: false,
      status: "OPEN",
      isClosing: false,
      isAgentTyping: false,
      isAiActive: true,
      humanHandoff: false,
      emailTranscript: false,
      useCurrentPageContent: false,
      timeoutSettings: null,
      appearanceSettings: null,
      bookingHours: null,
      bookingServices: [],
      bookingResources: [],
      industryTemplate: null,
      lastActivityAt: null,
      previewImages: [],
      previewIndex: 0,
      activeBookingSlots: null,
      activeBookingSummary: null,
      draftBookingSummary: null,
      activeBookingSuccess: null,
      activeBookingCancellation: null,
      cancelledBookingCodes: [],
      bookingType: null,
      partySize: null,
      selectedBookingSlots: [],
      selectedBookingServiceIds: [],
      setFeatureFlags: (flags) =>
        set((state) => ({
          isAiActive:
            flags.isAiActive !== undefined
              ? flags.isAiActive
              : state.isAiActive,
          humanHandoff:
            flags.humanHandoff !== undefined
              ? flags.humanHandoff
              : state.humanHandoff,
          emailTranscript:
            flags.emailTranscript !== undefined
              ? flags.emailTranscript
              : state.emailTranscript,
          useCurrentPageContent:
            flags.useCurrentPageContent !== undefined
              ? flags.useCurrentPageContent
              : state.useCurrentPageContent,
        })),
      setMessageFeedback: (messageId, rating) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId ? { ...m, feedbackRating: rating } : m,
          ),
        })),
      submitMessageFeedback: async (messageId, rating) => {
        const previousRating = get().messages.find(
          (m) => m.id === messageId,
        )?.feedbackRating;

        // Optimistically update feedback rating in store
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId ? { ...m, feedbackRating: rating } : m,
          ),
        }));

        try {
          const backendUrl = getBackendUrl();
          await submitMessageFeedbackApi(backendUrl, messageId, rating);
        } catch (err) {
          console.error("Error submitting message feedback:", err);
          // Rollback on error
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === messageId ? { ...m, feedbackRating: previousRating } : m,
            ),
          }));
        }
      },
      setPreview: (images, index) =>
        set({ previewImages: images, previewIndex: index }),
      closePreview: () => set({ previewImages: [], previewIndex: 0 }),
      setBookingSlots: (payload) =>
        set({ activeBookingSlots: payload, activeBookingSuccess: null }),
      setBookingSummary: (payload) =>
        set({
          activeBookingSlots: null,
          activeBookingSummary: payload,
          draftBookingSummary: payload,
        }),
      beginBookingSummaryEdit: () =>
        set({ activeBookingSlots: null, activeBookingSummary: null }),
      setBookingSuccess: (payload) =>
        set({
          activeBookingSlots: null,
          activeBookingSummary: null,
          draftBookingSummary: null,
          activeBookingSuccess: payload,
        }),
      addBookingSuccess: (payload) =>
        set((state) => {
          if (
            !payload ||
            typeof payload.bookingCode !== "string" ||
            !payload.bookingCode.trim() ||
            payload.bookingCode === "N/A" ||
            (payload as { error?: unknown }).error
          ) {
            return {
              activeBookingSlots: null,
              activeBookingSummary: null,
              draftBookingSummary: null,
              activeBookingSuccess: null,
            };
          }
          const id = `booking-success-${payload.bookingCode}`;
          if (state.messages.some((m) => m.id === id)) {
            return {
              activeBookingSlots: null,
              activeBookingSummary: null,
              draftBookingSummary: null,
              activeBookingSuccess: null,
            };
          }
          return {
            activeBookingSlots: null,
            activeBookingSummary: null,
            draftBookingSummary: null,
            activeBookingSuccess: null,
            messages: [
              ...state.messages,
              {
                id,
                role: "bot",
                text: "",
                createdAt: new Date().toISOString(),
                bookingSuccess: payload,
              },
            ],
          };
        }),
      setBookingCancellation: (payload) =>
        set({ activeBookingCancellation: payload }),
      markBookingCancelled: (payload) =>
        set((state) => ({
          activeBookingCancellation: null,
          cancelledBookingCodes: state.cancelledBookingCodes.includes(
            payload.bookingCode,
          )
            ? state.cancelledBookingCodes
            : [...state.cancelledBookingCodes, payload.bookingCode],
          messages: state.messages.map((message) =>
            message.bookingSuccess?.bookingCode === payload.bookingCode
              ? {
                  ...message,
                  bookingSuccess: {
                    ...message.bookingSuccess,
                    status: "cancelled",
                  },
                }
              : message,
          ),
        })),
      setBookingType: (type) =>
        set({
          bookingType: type,
          partySize: type === "single" ? 1 : null,
          selectedBookingSlots: [],
          selectedBookingServiceIds: [],
        }),
      setPartySize: (size) => set({ partySize: size }),
      setSelectedBookingSlots: (slots) => set({ selectedBookingSlots: slots }),
      setSelectedBookingServiceIds: (ids) =>
        set({ selectedBookingServiceIds: ids }),
      setSiteName: (name) => set({ siteName: name }),
      incrementUnreadCount: () =>
        set((state) => ({ unreadCount: state.unreadCount + 1 })),
      resetUnreadCount: () => set({ unreadCount: 0 }),
      setIsUserAtBottom: (val) => set({ isUserAtBottom: val }),
      setConversationId: (id) => set({ conversationId: id }),
      setVisitorToken: (token) => set({ visitorToken: token }),
      setVisitorInfo: (name, email) =>
        set({ visitorName: name, visitorEmail: email }),
      setStatus: (status) => set({ status }),
      setIsClosing: (isClosing) => set({ isClosing }),
      setTimeoutSettings: (settings) => set({ timeoutSettings: settings }),
      setAppearanceSettings: (settings) =>
        set({ appearanceSettings: settings }),
      setBookingHours: (hours) => set({ bookingHours: hours }),
      setBookingServices: (services) => set({ bookingServices: services }),
      setBookingResources: (resources) => set({ bookingResources: resources }),
      setIndustryTemplate: (template) => set({ industryTemplate: template }),
      updateLastActivityAt: (timestamp) =>
        set({ lastActivityAt: timestamp ?? Date.now() }),
      addMessage: (message) =>
        set((state) => {
          // Prevent duplicates
          if (state.messages.some((m) => m.id === message.id)) {
            return state;
          }
          const filteredMessages =
            message.role === "bot" || message.role === "system"
              ? state.messages.filter((m) => !m.id.startsWith("ai-stream-"))
              : state.messages;
          return {
            messages: [...filteredMessages, message],
            activeBookingSlots: clearsActiveSlots(message)
              ? null
              : state.activeBookingSlots,
            activeBookingCancellation:
              message.role === "user" ? null : state.activeBookingCancellation,
            activeBookingSuccess: null,
          };
        }),
      setMessages: (messages) => set({ messages }),
      updateMessageStatus: (id, status) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, status } : m,
          ),
        })),
      updateMessagesStatusByRole: (role, status, conditionStatus) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.role === role &&
            (!conditionStatus ||
              (m.status && conditionStatus.includes(m.status)))
              ? { ...m, status }
              : m,
          ),
        })),
      appendMessageChunk: (id, chunk) =>
        set((state) => {
          const exists = state.messages.find((m) => m.id === id);
          if (exists) {
            return {
              messages: state.messages.map((m) =>
                m.id === id ? { ...m, text: m.text + chunk } : m,
              ),
            };
          } else {
            return {
              messages: [
                ...state.messages,
                {
                  id,
                  role: "bot",
                  text: chunk,
                  createdAt: new Date().toISOString(),
                },
              ],
            };
          }
        }),
      removeMessage: (id) =>
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== id),
        })),
      setHasMoreMessages: (hasMore) => set({ hasMoreMessages: hasMore }),
      setIsLoadingMoreMessages: (loading) =>
        set({ isLoadingMoreMessages: loading }),
      prependMessages: (olderMessages) =>
        set((state) => {
          const existingIds = new Set(state.messages.map((m) => m.id));
          const uniqueOlder = olderMessages.filter(
            (m) => !existingIds.has(m.id),
          );
          return {
            messages: [...uniqueOlder, ...state.messages],
          };
        }),
      setAgentTyping: (isTyping) => set({ isAgentTyping: isTyping }),
      clearStore: () =>
        set({
          conversationId: null,
          visitorToken: null,
          // Note: we preserve visitorName and visitorEmail for pre-filling in RegistrationForm (Option 1)
          // and siteName so it persists across conversations
          unreadCount: 0,
          isUserAtBottom: true,
          messages: [],
          hasMoreMessages: false,
          isLoadingMoreMessages: false,
          status: "OPEN",
          isClosing: false,
          isAgentTyping: false,
          lastActivityAt: null,
          activeBookingSlots: null,
          activeBookingSummary: null,
          draftBookingSummary: null,
          activeBookingSuccess: null,
          activeBookingCancellation: null,
          cancelledBookingCodes: [],
        }),
    }),
    {
      name: (() => {
        const config = resolveWidgetConfig();
        return config.isTestMode
          ? `visitor-chat-store-test-${config.siteId}`
          : `visitor-chat-store-${config.siteId}`;
      })(),
      storage: createJSONStorage(() =>
        resolveWidgetConfig().isTestMode ? sessionStorage : localStorage,
      ),
      partialize: (state) => ({
        conversationId: state.conversationId,
        visitorToken: state.visitorToken,
        visitorName: state.visitorName,
        visitorEmail: state.visitorEmail,
        siteName: state.siteName,
        status: state.status,
        timeoutSettings: state.timeoutSettings,
        appearanceSettings: state.appearanceSettings,
        bookingHours: state.bookingHours,
        bookingServices: state.bookingServices,
        bookingResources: state.bookingResources,
        industryTemplate: state.industryTemplate,
        lastActivityAt: state.lastActivityAt,
        cancelledBookingCodes: state.cancelledBookingCodes,
        isAiActive: state.isAiActive,
        humanHandoff: state.humanHandoff,
        emailTranscript: state.emailTranscript,
        useCurrentPageContent: state.useCurrentPageContent,
      }),
    },
  ),
);
