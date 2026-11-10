"use client";

/**
 * Shared notice for AI quota / rate-limit failures.
 *
 * The Gemini free tier allows a limited number of requests per day. When the
 * budget is spent the API answers 429 with `AI_QUOTA_EXCEEDED` and the moment
 * the budget resets. This component renders that as a calm, actionable notice
 * instead of a raw error string.
 *
 * Used by every module that calls the AI (CV Analyzer, Career Roadmap,
 * Interview Simulator) so the wording stays consistent.
 */

type QuotaNoticeProps = {
  /** The message returned by the API (already user-facing). */
  message: string;
  /** Epoch ms when the quota resets. Optional — the message covers it. */
  resetsAt?: number;
  /** Extra class names for the wrapper. */
  className?: string;
};

/**
 * Format the reset moment as a wall-clock time.
 *
 * The API already tells the user how long they have to wait (through the
 * message it builds), so this only adds the concrete clock time — which
 * depends on the reset instant alone, not on the current time.
 */
function formatResetTime(resetsAt: number): string {
  const date = new Date(resetsAt);

  const time = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const day = date.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "numeric",
  });

  return `${time} ngày ${day}`;
}

/**
 * Render a quota notice.
 *
 * Returns null when there is nothing to show so callers can drop it into
 * their markup unconditionally.
 */
export function QuotaNotice({
  message,
  resetsAt,
  className = "",
}: QuotaNoticeProps) {
  if (!message) return null;

  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${className}`}
      role="alert"
    >
      <p className="font-medium">Đã hết lượt phân tích AI hôm nay</p>
      <p className="mt-1">{message}</p>
      {resetsAt !== undefined && (
        <p className="mt-1 text-xs text-amber-700">
          Lượt AI được làm mới khoảng {formatResetTime(resetsAt)}.
        </p>
      )}
    </div>
  );
}
