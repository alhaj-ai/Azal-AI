const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  if (typeof window !== "undefined") {
    // If the frontend is loaded on a development port (like Vite 5173),
    // point API requests directly to the FastAPI backend at port 8000.
    if (window.location.port !== "8000") {
      const hostname = window.location.hostname || "127.0.0.1";
      return `${window.location.protocol}//${hostname}:8000`;
    }
  }
  return "";
};

const API_BASE = getApiBase();

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: options?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail || "تعذّر تنفيذ الطلب.");
  }
  return data as T;
}

export type AgentStatus = "ok" | "failed" | "rejected_pii";

export type CustomerResponse = {
  status: AgentStatus;
  answer?: string;
  citations?: string[];
  error?: string | null;
  thread_id?: string;
};

export type SupervisorResponse = {
  status: AgentStatus;
  response?: string;
  tools_called?: string[];
  error?: string | null;
  thread_id?: string;
};

export type DocumentResponse = {
  name: string;
  result: {
    status: AgentStatus;
    reason?: string;
    data?: Record<string, unknown> & {
      validation?: { valid?: boolean; issues?: string[] };
      line_items?: Record<string, unknown>[];
    };
  };
};

export type ComplianceResponse = {
  status: AgentStatus;
  structured?: {
    aggregates: {
      period: string;
      invoice_count: number;
      total_spend: number;
      vendor_breakdown: Record<string, { count: number; spend: number }>;
      validation_failures: { invoice_id?: string; vendor_name?: string; issues?: string[] }[];
      median_invoice: number;
      largest_invoice?: { invoice_id?: string; vendor_name?: string; total?: number } | null;
      is_empty: boolean;
    };
    comparison: {
      available?: boolean;
      prior_period?: string;
      prior_spend?: number;
      current_spend?: number;
      spend_delta?: number;
      spend_change_pct?: number;
      vendor_changes?: {
        vendor_name: string;
        prior_spend: number;
        current_spend: number;
        delta: number;
        change_pct: number | null;
        status: "new" | "dropped" | "changed";
      }[];
      reason?: string;
    };
  };
  narrative?: string | null;
  error?: string | null;
};

export function queryTracking(query: string) {
  return request<{ status: string; answer: string; data?: any }>("/api/tracking/query", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export function getSalesRecommendations(query: string) {
  return request<{ status: string; answer: string; active_coupons?: any[] }>("/api/sales/recommend", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export function checkReturns(query: string) {
  return request<{ status: string; answer: string; policy?: any }>("/api/returns/check", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export function listSamples() {
  return request<{ status: "ok"; data: string[] }>("/api/invoices/samples");
}

export function askCustomer(question: string, sessionId: string = "default") {
  return request<CustomerResponse>("/api/customer/ask", {
    method: "POST",
    body: JSON.stringify({ question, session_id: sessionId }),
  });
}

export function askSupervisor(message: string, sessionId: string = "default") {
  return request<SupervisorResponse>("/api/supervisor/ask", {
    method: "POST",
    body: JSON.stringify({ message, session_id: sessionId }),
  });
}

export function getComplianceReport(year: number, month: number, smart: boolean = true) {
  return request<ComplianceResponse>("/api/compliance/report", {
    method: "POST",
    body: JSON.stringify({ year, month, smart }),
  });
}

export function analyzeDocument(input: { sampleName?: string; file?: File }) {
  const form = new FormData();
  if (input.sampleName) form.append("sample_name", input.sampleName);
  if (input.file) form.append("file", input.file);

  return request<DocumentResponse>("/api/document/analyze", {
    method: "POST",
    body: form,
  });
}

export type LLMProviderInfo = {
  name: string;
  base_url: string;
  api_key: string;
  model: string;
  is_local: boolean;
  enabled: boolean;
};

export type LLMConfig = {
  active_provider: string;
  temperature: number;
  max_tokens: number;
  providers: Record<string, LLMProviderInfo>;
};

export function getLLMSettings() {
  return request<{ status: string; data: LLMConfig }>("/api/settings/llm");
}

export function saveLLMSettings(config: LLMConfig) {
  return request<{ status: string; data: LLMConfig }>("/api/settings/llm", {
    method: "POST",
    body: JSON.stringify(config),
  });
}

export function testLLMConnection(providerData: Partial<LLMProviderInfo>) {
  return request<{ status: string; message: string; sample_reply?: string }>("/api/settings/llm/test", {
    method: "POST",
    body: JSON.stringify(providerData),
  });
}

export type StoreSettings = {
  storeName: string;
  tagline: string;
  branch: string;
  phone: string;
  currency: string;
  returnDays: number;
  exchangeDays: number;
};

export function getBackendStoreSettings() {
  return request<{ status: string; data: StoreSettings }>("/api/settings/store");
}

export function saveBackendStoreSettings(settings: StoreSettings) {
  return request<{ status: string; data: StoreSettings }>("/api/settings/store", {
    method: "POST",
    body: JSON.stringify(settings),
  });
}
