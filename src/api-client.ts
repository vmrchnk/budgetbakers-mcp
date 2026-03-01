import type { AgentHint } from "./types.js";

const BASE_URL = "https://rest.budgetbakers.com/wallet/v1/api";
const PAGE_LIMIT = 100;

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

function logHints(hints: AgentHint[]) {
  for (const hint of hints) {
    if (hint.severity === "warning") {
      console.error(`[API warning] ${hint.type}: ${hint.text}`);
    }
  }
}

async function request(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<Record<string, unknown>> {
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

  return response.json() as Promise<Record<string, unknown>>;
}

async function fetchByUrl(fullUrl: string): Promise<Record<string, unknown>> {
  const url = fullUrl.startsWith("http")
    ? fullUrl
    : `https://rest.budgetbakers.com${fullUrl}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API error ${response.status}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

/**
 * Extract array data from API envelope.
 * API wraps data in named keys: { accounts: [...], agentHints: [...], limit, offset }
 */
function extractArray<T>(envelope: Record<string, unknown>): {
  items: T[];
  hints: AgentHint[];
} {
  const hints = (envelope.agentHints as AgentHint[]) || [];
  logHints(hints);

  // Find the data array — it's the key that isn't agentHints/limit/offset/nextOffset/count/recordDateRange
  const metaKeys = new Set([
    "agentHints",
    "limit",
    "offset",
    "nextOffset",
    "count",
    "recordDateRange",
  ]);

  for (const [key, value] of Object.entries(envelope)) {
    if (!metaKeys.has(key) && Array.isArray(value)) {
      return { items: value as T[], hints };
    }
  }

  return { items: [], hints };
}

export async function fetchAll<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T[]> {
  const all: T[] = [];

  let envelope = await request(path, { ...params, limit: PAGE_LIMIT, offset: 0 });
  let { items, hints } = extractArray<T>(envelope);
  all.push(...items);

  // Follow pagination via agentHints
  while (true) {
    const paginationHint = hints.find(
      (h) => h.type === "pagination.has_more" && h.action?.url,
    );

    if (!paginationHint?.action?.url) break;

    envelope = await fetchByUrl(paginationHint.action.url);
    ({ items, hints } = extractArray<T>(envelope));
    all.push(...items);
  }

  return all;
}

export async function fetchOne<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T | null> {
  const envelope = await request(path, params);
  const { items } = extractArray<T>(envelope);
  return items[0] || null;
}
