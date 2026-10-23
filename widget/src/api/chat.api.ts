import type {
  ChatMessage,
  ChatMessageComponent,
  ChatRole,
  HandlingStatus,
  MessageStatusType,
} from "../store";
import { visitorDisplayText } from "../utils/chat-message.utils";

export interface StartConversationPayload {
  siteId: string;
  visitorName?: string;
  visitorEmail?: string;
  /** IANA timezone of the visitor's browser — used to format timestamps in the email transcript */
  timezone?: string;
}

export interface StartConversationResponse {
  conversationId: string;
  status: "OPEN" | "CLOSED" | "PAUSED";
  handlingStatus: HandlingStatus;
  visitorToken?: string;
}

export interface ConversationStatusResponse {
  status: "OPEN" | "CLOSED" | "PAUSED";
  handlingStatus: HandlingStatus;
}

export interface RawApiMessage {
  id: string;
  senderType: string;
  content: string;
  createdAt: string;
  status?: string;
  senderName?: string;
  locale?: string;
  components?: ChatMessageComponent[];
}

export interface SitePublicConfigResponse {
  id: string;
  name?: string;
  isEnabled?: boolean;
  isAiActive?: boolean;
  useCurrentPageContent?: boolean;
  allowedDomains?: string[];
  primaryColor?: string;
  backgroundColor?: string;
  botAvatar?: string;
  launcherIcon?: string;
  chatButtonPosition?: "Bottom Right" | "Bottom Left";
  headerTitle?: string;
  headerSubtitle?: string;
  defaultGreetingMessage?: string;
  chatWindowTitle?: string;
  chatButtonText?: string;
  showAvatar?: boolean;
  enableConversationTimeout?: boolean;
  inactivityTimeoutMinutes?: number;
  warningTimeMinutes?: number;
  inactivityWarningMessage?: string;
  timeoutMessage?: string;
  resetTimerOnBotResponse?: boolean;
  pauseTimerForAgentChats?: boolean;
  bookingEnabled?: boolean;
  bookingHours?: {
    timezone?: string | null;
    availableDays?: number[];
    startTime?: string;
    endTime?: string;
    slotDuration?: number;
  };
  bookingServices?: Array<{ id: string; name: string }>;
  bookingResources?: Array<{ id: string; name: string }>;
  industryTemplate?: string;
  industryTemplateConfig?: Record<string, unknown>;
  humanHandoff?: boolean;
  emailTranscript?: boolean;
}

/**
 * Starts a new visitor conversation.
 */
export const startConversationApi = async (
  backendUrl: string,
  payload: StartConversationPayload,
): Promise<StartConversationResponse> => {
  const res = await fetch(`${backendUrl}/api/v1/chat/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      timezone:
        payload.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });

  if (!res.ok) {
    let errorMsg = `Failed to start conversation (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson?.message) {
        errorMsg = Array.isArray(errorJson.message)
          ? errorJson.message.join(", ")
          : errorJson.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
};

/**
 * Fetches the current status and handlingStatus of a conversation.
 */
export const getConversationStatusApi = async (
  backendUrl: string,
  conversationId: string,
  visitorToken?: string | null,
): Promise<ConversationStatusResponse> => {
  const headers: Record<string, string> = {};
  if (visitorToken) {
    headers["Authorization"] = `Bearer ${visitorToken}`;
  }

  const res = await fetch(
    `${backendUrl}/api/v1/chat/public/conversations/${conversationId}/status`,
    { headers },
  );

  if (!res.ok) {
    let errorMsg = `Failed to fetch conversation status (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson?.message) {
        errorMsg = Array.isArray(errorJson.message)
          ? errorJson.message.join(", ")
          : errorJson.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
};

/**
 * Updates conversation status (e.g. PAUSED, CLOSED, OPEN) with optional reason and transcript email.
 */
export const updateConversationStatusApi = async (
  backendUrl: string,
  conversationId: string,
  status: "OPEN" | "CLOSED" | "PAUSED",
  options?: {
    reason?: string;
    transcriptEmail?: string;
  },
  visitorToken?: string | null,
): Promise<void> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (visitorToken) {
    headers["Authorization"] = `Bearer ${visitorToken}`;
  }

  const res = await fetch(
    `${backendUrl}/api/v1/chat/public/conversations/${conversationId}/status`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status,
        reason: options?.reason,
        transcriptEmail: options?.transcriptEmail?.trim() || undefined,
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to update conversation status (${res.status})`);
  }
};

/**
 * Fetches messages history for a conversation and maps it to ChatMessage entities.
 */
export const getConversationMessagesApi = async (
  backendUrl: string,
  conversationId: string,
  visitorToken?: string | null,
  options?: { cursor?: string; limit?: number },
): Promise<ChatMessage[]> => {
  const headers: Record<string, string> = {};
  if (visitorToken) {
    headers["Authorization"] = `Bearer ${visitorToken}`;
  }

  const params = new URLSearchParams();
  if (options?.cursor) params.set("cursor", options.cursor);
  if (options?.limit) params.set("limit", String(options.limit));
  const queryString = params.toString() ? `?${params.toString()}` : "";

  const res = await fetch(
    `${backendUrl}/api/v1/chat/public/conversations/${conversationId}/messages${queryString}`,
    { headers },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch messages (${res.status})`);
  }

  const data = await res.json();
  const rows: RawApiMessage[] = Array.isArray(data) ? data : (data?.data ?? []);

  return rows.map((msg) => ({
    id: msg.id,
    role: (msg.senderType === "VISITOR"
      ? "user"
      : msg.senderType === "SYSTEM"
        ? "system"
        : msg.senderType === "AI"
          ? "bot"
          : "agent") as ChatRole,
    text:
      msg.senderType === "VISITOR"
        ? visitorDisplayText(msg.content)
        : msg.content,
    createdAt: msg.createdAt,
    status: msg.status as MessageStatusType,
    senderName: msg.senderName,
    locale: msg.locale,
    components: msg.components,
  }));
};

/**
 * Requests handoff to a human agent.
 */
export const callAgentApi = async (
  backendUrl: string,
  conversationId: string,
  visitorToken?: string | null,
): Promise<void> => {
  const headers: Record<string, string> = {};
  if (visitorToken) {
    headers["Authorization"] = `Bearer ${visitorToken}`;
  }

  const res = await fetch(
    `${backendUrl}/api/v1/chat/public/conversations/${conversationId}/call-agent`,
    {
      method: "PATCH",
      headers,
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to call agent (${res.status})`);
  }
};

/**
 * Fetches public site settings and appearance configurations.
 */
export const fetchSitePublicConfigApi = async (
  backendUrl: string,
  siteId: string,
): Promise<SitePublicConfigResponse> => {
  const res = await fetch(`${backendUrl}/api/v1/sites/public/${siteId}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch site info (${res.status})`);
  }

  return res.json();
};

/**
 * Submits helpfulness feedback on an assistant message.
 */
export const submitMessageFeedbackApi = async (
  backendUrl: string,
  messageId: string,
  rating: "HELPFUL" | "UNHELPFUL",
): Promise<void> => {
  const res = await fetch(
    `${backendUrl}/api/v1/chat/public/messages/${messageId}/feedback`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to submit message feedback (${res.status})`);
  }
};

/**
 * Uploads a file attachment for a conversation.
 */
export const uploadAttachmentApi = async (
  backendUrl: string,
  conversationId: string,
  file: File | Blob,
  visitorToken?: string | null,
): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (visitorToken) {
    headers["Authorization"] = `Bearer ${visitorToken}`;
  }

  const res = await fetch(
    `${backendUrl}/api/v1/chat/public/conversations/${conversationId}/upload`,
    {
      method: "POST",
      headers,
      body: formData,
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to upload attachment (${res.status})`);
  }

  return res.json();
};

export interface AvailableSlotItem {
  timeSlot: string;
  available?: boolean;
}

export interface FetchAvailableSlotsParams {
  date: string;
  resourceId?: string;
  serviceId?: string;
}

/**
 * Fetches available booking slots for a given date, resource, and service.
 */
export const fetchAvailableSlotsApi = async (
  backendUrl: string,
  siteId: string,
  params: FetchAvailableSlotsParams,
): Promise<AvailableSlotItem[]> => {
  const queryParams = new URLSearchParams({ date: params.date });
  if (params.resourceId && params.resourceId.trim()) {
    queryParams.set("resourceId", params.resourceId.trim());
  }
  if (
    params.serviceId &&
    params.serviceId.trim() &&
    params.serviceId !== "undefined"
  ) {
    queryParams.set("serviceId", params.serviceId.trim());
  }

  const res = await fetch(
    `${backendUrl}/api/v1/sites/public/${siteId}/available-slots?${queryParams.toString()}`,
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch slots (${res.status})`);
  }

  const data = await res.json();
  return data.slots || [];
};

export interface ChatApiClient {
  readonly backendUrl: string;
  readonly siteId: string;
  startConversation: (
    payload: StartConversationPayload,
  ) => Promise<StartConversationResponse>;
  getConversationStatus: (
    conversationId: string,
    visitorToken?: string | null,
  ) => Promise<ConversationStatusResponse>;
  updateConversationStatus: (
    conversationId: string,
    status: "OPEN" | "CLOSED" | "PAUSED",
    options?: {
      reason?: string;
      transcriptEmail?: string;
    },
    visitorToken?: string | null,
  ) => Promise<void>;
  getConversationMessages: (
    conversationId: string,
    visitorToken?: string | null,
    options?: { cursor?: string; limit?: number },
  ) => Promise<ChatMessage[]>;
  callAgent: (
    conversationId: string,
    visitorToken?: string | null,
  ) => Promise<void>;
  fetchSitePublicConfig: (
    customSiteId?: string,
  ) => Promise<SitePublicConfigResponse>;
  submitMessageFeedback: (
    messageId: string,
    rating: "HELPFUL" | "UNHELPFUL",
  ) => Promise<void>;
  uploadAttachment: (
    conversationId: string,
    file: File | Blob,
    visitorToken?: string | null,
  ) => Promise<{ url: string }>;
  fetchAvailableSlots: (
    params: FetchAvailableSlotsParams,
    customSiteId?: string,
  ) => Promise<AvailableSlotItem[]>;
}

/**
 * Creates a pre-bound ChatApiClient instance with default backendUrl and siteId.
 */
export const createChatApiClient = (config: {
  backendUrl: string;
  siteId?: string;
}): ChatApiClient => {
  const backendUrl = config.backendUrl;
  const defaultSiteId = config.siteId || "";

  return {
    backendUrl,
    siteId: defaultSiteId,
    startConversation: (payload) => startConversationApi(backendUrl, payload),
    getConversationStatus: (conversationId, visitorToken) =>
      getConversationStatusApi(backendUrl, conversationId, visitorToken),
    updateConversationStatus: (conversationId, status, options, visitorToken) =>
      updateConversationStatusApi(
        backendUrl,
        conversationId,
        status,
        options,
        visitorToken,
      ),
    getConversationMessages: (conversationId, visitorToken, options) =>
      getConversationMessagesApi(
        backendUrl,
        conversationId,
        visitorToken,
        options,
      ),
    callAgent: (conversationId, visitorToken) =>
      callAgentApi(backendUrl, conversationId, visitorToken),
    fetchSitePublicConfig: (customSiteId) =>
      fetchSitePublicConfigApi(backendUrl, customSiteId || defaultSiteId),
    submitMessageFeedback: (messageId, rating) =>
      submitMessageFeedbackApi(backendUrl, messageId, rating),
    uploadAttachment: (conversationId, file, visitorToken) =>
      uploadAttachmentApi(backendUrl, conversationId, file, visitorToken),
    fetchAvailableSlots: (params, customSiteId) =>
      fetchAvailableSlotsApi(backendUrl, customSiteId || defaultSiteId, params),
  };
};
