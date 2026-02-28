const BASE_URL = "https://rest.budgetbakers.com/wallet/v1/api";
const PAGE_LIMIT = 200;

function getToken(): string {
  const token = process.env.BUDGETBAKERS_API_TOKEN;
  if (!token) {
    throw new Error("BUDGETBAKERS_API_TOKEN environment variable is not set");
  }
  return token;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface AgentHint {
  type: string;
  severity: "instruction" | "warning" | "info";
  message: string;
  nextPageUrl?: string;
}

export interface ApiResponse<T> {
  data: T;
  hints: AgentHint[];
}

async function request<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<ApiResponse<T>> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  url.searchParams.set("agentHints", "true");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 401) {
      throw new ApiError(401, "Unauthorized — check BUDGETBAKERS_API_TOKEN");
    }
    if (response.status === 429) {
      throw new ApiError(429, "Rate limited — try again later");
    }
    if (response.status === 409) {
      throw new ApiError(409, "Sync in progress — try again in a few seconds");
    }
    throw new ApiError(
      response.status,
      `API error ${response.status}: ${body}`,
    );
  }

  const json = await response.json();

  // API may return { data, hints } envelope or raw array/object
  if (json && typeof json === "object" && "hints" in json && "data" in json) {
    const hints: AgentHint[] = Array.isArray(json.hints) ? json.hints : [];
    for (const hint of hints) {
      if (hint.severity === "warning") {
        console.error(`[API hint] ${hint.type}: ${hint.message}`);
      }
    }
    return { data: json.data as T, hints };
  }

  // Fallback: no hints envelope — raw response
  return { data: json as T, hints: [] };
}

async function fetchByUrl<T>(fullUrl: string): Promise<ApiResponse<T>> {
  const response = await fetch(fullUrl, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API error ${response.status}`);
  }

  const json = await response.json();

  if (json && typeof json === "object" && "hints" in json && "data" in json) {
    const hints: AgentHint[] = Array.isArray(json.hints) ? json.hints : [];
    for (const hint of hints) {
      if (hint.severity === "warning") {
        console.error(`[API hint] ${hint.type}: ${hint.message}`);
      }
    }
    return { data: json.data as T, hints };
  }

  return { data: json as T, hints: [] };
}

export async function fetchAll<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T[]> {
  const all: T[] = [];

  let resp = await request<T[]>(path, {
    ...params,
    limit: PAGE_LIMIT,
    offset: 0,
  });

  const addPage = (data: unknown) => {
    if (Array.isArray(data)) {
      all.push(...data);
    }
  };

  addPage(resp.data);

  // Use pagination.has_more hint with nextPageUrl when available
  while (true) {
    const paginationHint = resp.hints.find(
      (h) => h.type === "pagination.has_more" && h.nextPageUrl,
    );

    if (paginationHint?.nextPageUrl) {
      resp = await fetchByUrl<T[]>(paginationHint.nextPageUrl);
      addPage(resp.data);
    } else {
      break;
    }
  }

  return all;
}

export async function fetchOne<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const resp = await request<T>(path, params);
  return resp.data;
}
