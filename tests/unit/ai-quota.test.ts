/**
 * Unit tests for AI quota detection.
 *
 * The Gemini free tier answers with HTTP 429 and a `RESOURCE_EXHAUSTED` body
 * when the daily request budget is spent. These tests pin the detection and
 * the user-facing description, because the raw provider payload must never
 * leak to the end user.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_QUOTA_EXCEEDED_CODE,
  describeQuotaExceeded,
  formatResetCountdown,
  isQuotaExceeded,
} from "@/lib/ai/quota";
import { readQuotaError } from "@/lib/ai/quota-client";

// The exact payload the provider returned in the reported incident.
const REAL_429_MESSAGE = `429 [{"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://aistudio.google.com/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.6-flash, description: Generate content requests per day limit exceeded on Free Tier. See https://aistudio.google.com/docs/rate-limits.\nPlease retry in 4h51m2.402105417s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://aistudio.google.com/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"description":"Generate content requests per day limit exceeded on Free Tier. See https://aistudio.google.com/docs/rate-limits.","quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-3.6-flash"},"quotaValue":"20"}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"17462s"}]}}]`;

// ─── isQuotaExceeded ─────────────────────────────────────────────────────────

test("isQuotaExceeded detects the real provider 429 message", () => {
  const err = new Error(REAL_429_MESSAGE);

  assert.equal(isQuotaExceeded(err), true);
});

test("isQuotaExceeded detects an APIError carrying a 429 status", () => {
  const err = Object.assign(new Error("Rate limit reached"), {
    status: 429,
  });

  assert.equal(isQuotaExceeded(err), true);
});

test("isQuotaExceeded detects a RESOURCE_EXHAUSTED payload without a status", () => {
  const err = new Error('{"error":{"status":"RESOURCE_EXHAUSTED","message":"quota exceeded"}}');

  assert.equal(isQuotaExceeded(err), true);
});

test("isQuotaExceeded detects a rate-limit message", () => {
  assert.equal(isQuotaExceeded(new Error("429 Too Many Requests: rate limit reached")), true);
});

test("isQuotaExceeded ignores ordinary failures", () => {
  assert.equal(isQuotaExceeded(new Error("Internal server error")), false);
  assert.equal(isQuotaExceeded(new Error("AI request failed: timeout")), false);
});

test("isQuotaExceeded ignores a non-quota 400", () => {
  const err = Object.assign(new Error("Bad Request"), { status: 400 });

  assert.equal(isQuotaExceeded(err), false);
});

// ─── describeQuotaExceeded ───────────────────────────────────────────────────

test("describeQuotaExceeded returns the shared quota code", () => {
  const quota = describeQuotaExceeded(new Error(REAL_429_MESSAGE));

  assert.equal(quota.code, AI_QUOTA_EXCEEDED_CODE);
});

test("describeQuotaExceeded hides the raw provider payload", () => {
  const quota = describeQuotaExceeded(new Error(REAL_429_MESSAGE));

  // The message must not leak quota ids, metric names, or the JSON body.
  assert.doesNotMatch(quota.message, /RESOURCE_EXHAUSTED/);
  assert.doesNotMatch(quota.message, /quotaMetric/);
  assert.doesNotMatch(quota.message, /generate_content_free_tier/);
  assert.doesNotMatch(quota.message, /429/);
  assert.doesNotMatch(quota.message, /aistudio\.googleapis\.com/);
});

test("describeQuotaExceeded keeps the message user-facing", () => {
  const quota = describeQuotaExceeded(new Error(REAL_429_MESSAGE));

  assert.match(quota.message, /lượt phân tích AI/i);
  assert.match(quota.message, /làm mới/i);
});

test("describeQuotaExceeded derives the reset time from the retry delay", () => {
  const now = 1_700_000_000_000;
  const quota = describeQuotaExceeded(new Error(REAL_429_MESSAGE), now);

  // The provider said "17462s" — that is 17462 seconds from `now`.
  assert.equal(quota.resetsAt, now + 17_462 * 1000);
});

test("describeQuotaExceeded falls back to the next UTC day without a retry delay", () => {
  const now = Date.UTC(2026, 10, 10, 12, 0, 0);
  const quota = describeQuotaExceeded(new Error("quota exceeded"), now);

  assert.equal(quota.resetsAt, Date.UTC(2026, 10, 11, 0, 0, 0));
});

// ─── formatResetCountdown ───────────────────────────────────────────────────

test("formatResetCountdown reports minutes under an hour", () => {
  const now = 1_700_000_000_000;
  const message = formatResetCountdown(now + 30 * 60_000, now);

  assert.match(message ?? "", /30 phút/);
});

test("formatResetCountdown reports hours and minutes", () => {
  const now = 1_700_000_000_000;
  const message = formatResetCountdown(now + (4 * 60 + 51) * 60_000, now);

  assert.match(message ?? "", /4 giờ 51 phút/);
});

test("formatResetCountdown reports whole hours", () => {
  const now = 1_700_000_000_000;
  const message = formatResetCountdown(now + 3 * 60 * 60_000, now);

  assert.match(message ?? "", /3 giờ/);
  assert.doesNotMatch(message ?? "", /phút/);
});

test("formatResetCountdown returns undefined for a past reset time", () => {
  const now = 1_700_000_000_000;

  assert.equal(formatResetCountdown(now - 1000, now), undefined);
});

test("formatResetCountdown returns undefined when there is no reset time", () => {
  assert.equal(formatResetCountdown(undefined), undefined);
});

// ─── readQuotaError (client side) ───────────────────────────────────────────

test("readQuotaError reads the nested API error shape", () => {
  const body = {
    error: {
      code: "AI_QUOTA_EXCEEDED",
      message: "Bạn đã dùng hết lượt phân tích AI trong ngày.",
      resetsAt: 1_700_000_000_000,
    },
  };

  const quota = readQuotaError(body);

  assert.ok(quota);
  assert.equal(quota.message, "Bạn đã dùng hết lượt phân tích AI trong ngày.");
  assert.equal(quota.resetsAt, 1_700_000_000_000);
});

test("readQuotaError reads the flat legacy shape", () => {
  const body = { code: "AI_QUOTA_EXCEEDED", message: "Hết lượt." };

  const quota = readQuotaError(body);

  assert.ok(quota);
  assert.equal(quota.message, "Hết lượt.");
  assert.equal(quota.resetsAt, undefined);
});

test("readQuotaError returns null for other errors", () => {
  assert.equal(readQuotaError({ error: { code: "AI_REQUEST_FAILED" } }), null);
  assert.equal(readQuotaError({ error: { code: "VALIDATION_ERROR" } }), null);
  assert.equal(readQuotaError(null), null);
  assert.equal(readQuotaError("nope"), null);
});

test("readQuotaError supplies a default message when none is present", () => {
  const quota = readQuotaError({ error: { code: "AI_QUOTA_EXCEEDED" } });

  assert.ok(quota);
  assert.match(quota.message, /lượt phân tích AI/i);
});
