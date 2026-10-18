import { WEATHER_RETRIES, WEATHER_TIMEOUT_MS } from "../config";

export type FetchFn = typeof fetch;

/// Weather calls: 5-second timeout, one retry (docs/00-global.md §3).
export async function fetchWithTimeoutRetry(
  url: string,
  fetchFn: FetchFn = fetch,
  timeoutMs: number = WEATHER_TIMEOUT_MS,
  retries: number = WEATHER_RETRIES,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Weather request failed");
}