/**
 * Quota-exceeded detection for AI provider errors.
 *
 * The Gemini free tier allows a fixed number of generate-content requests per
 * day (20 by default, per project, per model). When that budget is spent the
 * provider answers with HTTP 429 and a `RESOURCE_EXHAUSTED` body.
 *
 * The raw provider message is long, technical, and leaks internals — it must
 * never reach the end user as-is. This module turns the raw error into a
 * small, structured, user-facing description:
 *
 *   - a dedicated error code so routes can answer with 429 instead of 500
 *   - a human message ("Bạn đã dùng hết lượt AI hôm nay...")
 *   - the moment the quota resets, so the UI can show a countdown
 *
 * Kept dependency-free and side-effect free so it can be unit tested without
 * touching the network.
 */

/** The error code used for quota failures across the whole app. */
export const AI_QUOTA_EXCEEDED_CODE = "AI_QUOTA_EXCEEDED";

/** How long a quota window lasts by default when the provider does not say. */
const DEFAULT_QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * A quota failure, normalised into something the API layer can serialise.
 */
export type QuotaInfo = {
  /** Stable code the API returns to the client. */
  code: typeof AI_QUOTA_EXCEEDED_CODE;
  /** Message shown to the end user (Vietnamese, no provider internals). */
  message: string;
  /** Epoch milliseconds when the quota resets. `undefined` if unknown. */
  resetsAt?: number;
};

/**
 * The Gemini API surfaces rate limits in two different shapes depending on
 * the transport:
 *
 *   1. an `APIError` from the OpenAI SDK, whose `status` is 429 and whose
 *      `error.error` holds the decoded Google payload;
 *   2. a plain `Error` whose message embeds the JSON body as a string.
 *
 * Both are checked so we catch the limit wherever it surfaces.
 */
function extractProviderPayload(err: unknown): {
  status?: number;
  body?: unknown;
  text: string;
} {
  const candidate = err as {
    status?: unknown;
    statusCode?: unknown;
    code?: unknown;
    error?: unknown;
    message?: unknown;
  } | null;

  const status =
    typeof candidate?.status === "number"
      ? candidate.status
      : typeof candidate?.statusCode === "number"
        ? candidate.statusCode
        : undefined;

  const text =
    typeof candidate?.message === "string"
      ? candidate.message
      : err instanceof Error
        ? err.message
        : String(err);

  // `error.error` is the decoded Google payload for APIError instances.
  let body = candidate?.error;

  // Otherwise, try to pull a JSON object out of the message text. The
  // provider embeds the whole payload in the message for 429s.
  if (body === undefined) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        body = JSON.parse(text.slice(start, end + 1));
      } catch {
        body = undefined;
      }
    }
  }

  return { status, body, text };
}

/**
 * Pull the `retryDelay` (seconds) out of the provider payload.
 *
 * The Google payload carries it in `details[]` as a `RetryInfo` entry, either
 * as a `retryDelay` string ("17462s") or as `retryDelayDuration` ("17462s").
 */
function extractRetryDelaySeconds(body: unknown, text: string): number | undefined {
  const collect = (value: unknown): number | undefined => {
    if (!value || typeof value !== "object") return undefined;
    const details = (value as { details?: unknown[] }).details;
    if (!Array.isArray(details)) return undefined;

    for (const detail of details) {
      if (!detail || typeof detail !== "object") continue;
      const d = detail as { retryDelay?: unknown; retryDelayDuration?: unknown };
      const raw = d.retryDelay ?? d.retryDelayDuration;
      if (typeof raw === "string") {
        const seconds = Number.parseFloat(raw.replace("s", ""));
        if (Number.isFinite(seconds) && seconds > 0) return seconds;
      }
      if (typeof raw === "number" && raw > 0) return raw;
    }
    return undefined;
  };

  const fromBody = collect(body);
  if (fromBody !== undefined) return fromBody;

  // Fall back to scanning the raw text for a "retryDelay":"...s" fragment.
  const match = text.match(/retryDelay"?\s*[:"]\s*"?(\d+(?:\.\d+)?)s/i);
  if (match) {
    const seconds = Number.parseFloat(match[1]);
    if (Number.isFinite(seconds) && seconds > 0) return seconds;
  }

  return undefined;
}

/**
 * Decide whether an error is a provider quota failure.
 *
 * Treats these as quota errors:
 *   - HTTP 429 with a quota/rate-limit body
 *   - any error mentioning "quota exceeded" / "RESOURCE_EXHAUSTED" /
 *     "rate limit" — the provider sometimes reports 429 as a 500 with the
 *     real status only inside the message.
 */
export function isQuotaExceeded(err: unknown): boolean {
  const { status, body, text } = extractProviderPayload(err);

  const lower = text.toLowerCase();
  const mentionsQuota =
    lower.includes("quota exceeded") ||
    lower.includes("resource_exhausted") ||
    lower.includes("rate limit") ||
    lower.includes("ratelimit") ||
    lower.includes("resource exhausted");

  const mentionsQuotaInBody =
    typeof body === "object" &&
    body !== null &&
    JSON.stringify(body).toLowerCase().includes("quota");

  if (status === 429) return true;
  if (mentionsQuota) return true;
  if (mentionsQuotaInBody && (mentionsQuota || status === 429)) return true;

  return false;
}

/**
 * Build the user-facing description of a quota failure.
 *
 * `resetsAt` is derived from the provider's `retryDelay` when present. When
 * it is missing we assume the daily window and point at tomorrow, which keeps
 * the message honest ("hôm nay" / "ngày mai") without inventing a precise
 * timestamp.
 */
export function describeQuotaExceeded(
  err: unknown,
  now: number = Date.now()
): QuotaInfo {
  const { body, text } = extractProviderPayload(err);
  const retrySeconds = extractRetryDelaySeconds(body, text);

  let resetsAt: number | undefined;
  if (retrySeconds !== undefined) {
    resetsAt = now + retrySeconds * 1000;
  } else {
    // The daily window resets on the UTC day boundary.
    const nextUtcMidnight = Date.UTC(
      new Date(now).getUTCFullYear(),
      new Date(now).getUTCMonth(),
      new Date(now).getUTCDate() + 1
    );
    resetsAt = nextUtcMidnight;
  }

  return {
    code: AI_QUOTA_EXCEEDED_CODE,
    message:
      "Bạn đã dùng hết lượt phân tích AI trong ngày. Vui lòng thử lại sau khi hạn mức được làm mới.",
    resetsAt,
  };
}

/**
 * Format the time until the quota resets in a human-friendly Vietnamese way.
 *
 * Used by the API layer to append a precise retry hint to the message.
 */
export function formatResetCountdown(
  resetsAt: number | undefined,
  now: number = Date.now()
): string | undefined {
  if (resetsAt === undefined) return undefined;

  const diffMs = resetsAt - now;
  if (diffMs <= 0) return undefined;

  const totalMinutes = Math.ceil(diffMs / 60_000);

  if (totalMinutes < 60) {
    return `Lượt AI sẽ được làm mới sau khoảng ${totalMinutes} phút.`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours < 24) {
    return minutes > 0
      ? `Lượt AI sẽ được làm mới sau khoảng ${hours} giờ ${minutes} phút.`
      : `Lượt AI sẽ được làm mới sau khoảng ${hours} giờ.`;
  }

  const days = Math.round(hours / 24);
  return `Lượt AI sẽ được làm mới sau khoảng ${days} ngày.`;
}

/**
 * The default quota window, exported for tests.
 */
export const QUOTA_WINDOW_MS = DEFAULT_QUOTA_WINDOW_MS;
