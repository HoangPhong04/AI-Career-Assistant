/**
 * Client-side helper for reading an AI quota failure out of an API error
 * body.
 *
 * The API answers 429 with `{ error: { code: "AI_QUOTA_EXCEEDED", message,
 * resetsAt } }` when the provider's daily request budget is spent. This helper
 * recognises that shape so every module can render the same friendly notice
 * instead of a raw provider error string.
 */

export type QuotaError = {
  message: string;
  resetsAt?: number;
};

export type ApiFailure = {
  message: string;
  quota: QuotaError | null;
};

const DEFAULT_API_ERROR_MESSAGE = "Đã xảy ra lỗi. Vui lòng thử lại.";

export async function readApiFailure(
  response: Pick<Response, "json">
): Promise<ApiFailure> {
  const body: unknown = await response.json().catch(() => ({}));
  const error =
    typeof body === "object" && body !== null && "error" in body
      ? body.error
      : null;
  const message =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : DEFAULT_API_ERROR_MESSAGE;

  return {
    message,
    quota: readQuotaError(body),
  };
}

/**
 * Return the quota details when `body` describes a quota failure, else null.
 *
 * Accepts both the nested `{ error: {...} }` shape used by `apiError` and the
 * flat `{ code, message }` shape some legacy routes return.
 */
export function readQuotaError(body: unknown): QuotaError | null {
  if (typeof body !== "object" || body === null) return null;

  const flat = body as { code?: unknown; message?: unknown };
  const nested = (body as { error?: { code?: unknown; message?: unknown; resetsAt?: unknown } })
    .error;

  const code = nested?.code ?? flat.code;
  if (code !== "AI_QUOTA_EXCEEDED") return null;

  const message = nested?.message ?? flat.message;

  return {
    message:
      typeof message === "string" && message
        ? message
        : "Bạn đã dùng hết lượt phân tích AI trong ngày. Vui lòng thử lại sau khi hạn mức được làm mới.",
    resetsAt: typeof nested?.resetsAt === "number" ? nested.resetsAt : undefined,
  };
}
