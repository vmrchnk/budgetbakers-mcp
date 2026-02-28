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

async function request<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

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

  return response.json() as Promise<T>;
}

export async function fetchAll<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;

  while (true) {
    const page = await request<T[]>(path, {
      ...params,
      limit: PAGE_LIMIT,
      offset,
    });

    if (!Array.isArray(page)) {
      // Some endpoints return the array directly, some wrap it
      return page as unknown as T[];
    }

    all.push(...page);

    if (page.length < PAGE_LIMIT) {
      break;
    }
    offset += PAGE_LIMIT;
  }

  return all;
}

export async function fetchOne<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  return request<T>(path, params);
}
