/**
 * Unit tests for AI failure handling in the Career module.
 *
 * The requirement (plan.md · T10-NA-23) is that a failing AI call surfaces a
 * clear error and never corrupts the data that was already persisted.
 *
 * The AI client is mocked through `aiInternals.chatCompletion`, exactly like
 * `career-roadmap.test.ts` does.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { AICareerError, aiInternals } from "@/lib/ai";
import { analyzeSkillGap, generateRoadmap } from "@/lib/career";

// ─── Stub state ───────────────────────────────────────────────────────────────

type MockState = {
  response: string;
  error: Error | null;
  callCount: number;
};

const mockState: MockState = {
  response: "",
  error: null,
  callCount: 0,
};

test.before(() => {
  test.mock.method(aiInternals, "chatCompletion", async () => {
    mockState.callCount += 1;
    if (mockState.error) throw mockState.error;
    return mockState.response;
  });
});

function resetMock(): void {
  mockState.response = "";
  mockState.error = null;
  mockState.callCount = 0;
}

// ─── Timeout ─────────────────────────────────────────────────────────────────

test("analyzeSkillGap surfaces a timeout as AI_REQUEST_FAILED", async () => {
  resetMock();
  const timeout = new AICareerError(
    "Request timed out after 45000ms",
    "AI_REQUEST_FAILED"
  );
  mockState.error = timeout;

  await assert.rejects(
    () => analyzeSkillGap({ targetRole: "Backend Engineer", currentLevel: "junior" }),
    (err: unknown) => {
      assert.ok(err instanceof AICareerError);
      assert.equal((err as AICareerError).code, "AI_REQUEST_FAILED");
      assert.match((err as Error).message, /timed out/);
      return true;
    }
  );
});

test("generateRoadmap surfaces a timeout as AI_REQUEST_FAILED", async () => {
  resetMock();
  mockState.error = new AICareerError(
    "Request timed out after 45000ms",
    "AI_REQUEST_FAILED"
  );

  await assert.rejects(
    () => generateRoadmap({ targetRole: "Backend Engineer", currentLevel: "junior" }),
    (err: unknown) => {
      assert.ok(err instanceof AICareerError);
      assert.equal((err as AICareerError).code, "AI_REQUEST_FAILED");
      return true;
    }
  );
});

test("a plain network error is wrapped into AI_REQUEST_FAILED", async () => {
  resetMock();
  // A raw network failure (not an AICareerError) must still be normalised.
  mockState.error = new Error("ECONNRESET");

  await assert.rejects(
    () => analyzeSkillGap({ targetRole: "Backend Engineer", currentLevel: "junior" }),
    (err: unknown) => {
      assert.ok(err instanceof AICareerError);
      assert.equal((err as AICareerError).code, "AI_REQUEST_FAILED");
      assert.match((err as Error).message, /ECONNRESET/);
      return true;
    }
  );
});

// ─── Rate limit ──────────────────────────────────────────────────────────────

test("a rate limit error is surfaced with the original message", async () => {
  resetMock();
  mockState.error = new AICareerError(
    "Rate limit reached for model gemini-3.5-flash. Please retry later.",
    "AI_REQUEST_FAILED"
  );

  await assert.rejects(
    () => generateRoadmap({ targetRole: "DevOps Engineer", currentLevel: "mid" }),
    (err: unknown) => {
      assert.ok(err instanceof AICareerError);
      assert.equal((err as AICareerError).code, "AI_REQUEST_FAILED");
      assert.match((err as Error).message, /Rate limit/);
      return true;
    }
  );
});

test("a missing API key is surfaced as API_KEY_MISSING", async () => {
  resetMock();
  mockState.error = new AICareerError(
    "GEMINI_API_KEY is not configured.",
    "API_KEY_MISSING"
  );
  await assert.rejects(
    () => analyzeSkillGap({ targetRole: "Backend Engineer", currentLevel: "junior" }),
    (err: unknown) => {
      assert.ok(err instanceof AICareerError);
      assert.equal((err as AICareerError).code, "API_KEY_MISSING");
      return true;
    }
  );
});

// ─── Quota exhausted ─────────────────────────────────────────────────────────

test("analyzeSkillGap surfaces a quota failure with its own code", async () => {
  resetMock();
  mockState.error = new AICareerError(
    "Bạn đã dùng hết lượt phân tích AI trong ngày.",
    "AI_QUOTA_EXCEEDED",
    1_700_000_000_000
  );

  await assert.rejects(
    () => analyzeSkillGap({ targetRole: "Kế toán trưởng", currentLevel: "junior" }),
    (err: unknown) => {
      assert.ok(err instanceof AICareerError);
      assert.equal((err as AICareerError).code, "AI_QUOTA_EXCEEDED");
      assert.equal((err as AICareerError).resetsAt, 1_700_000_000_000);
      return true;
    }
  );
});

test("generateRoadmap surfaces a quota failure with its own code", async () => {
  resetMock();
  mockState.error = new AICareerError(
    "Bạn đã dùng hết lượt phân tích AI trong ngày.",
    "AI_QUOTA_EXCEEDED",
    1_700_000_000_000
  );

  await assert.rejects(
    () => generateRoadmap({ targetRole: "Kế toán trưởng", currentLevel: "junior" }),
    (err: unknown) => {
      assert.ok(err instanceof AICareerError);
      assert.equal((err as AICareerError).code, "AI_QUOTA_EXCEEDED");
      return true;
    }
  );
});

// ─── Data integrity on failure ───────────────────────────────────────────────

test("a failed AI call does not return partial or malformed data", async () => {
  resetMock();
  mockState.error = new AICareerError("boom", "AI_REQUEST_FAILED");

  // The rejection must happen rather than resolving with a half-built result.
  let resolved = false;
  await analyzeSkillGap({ targetRole: "Backend Engineer", currentLevel: "junior" })
    .then(() => {
      resolved = true;
    })
    .catch(() => undefined);

  assert.equal(resolved, false);
});

test("an empty AI response is rejected rather than producing an empty gap", async () => {
  resetMock();
  mockState.response = "";

  await assert.rejects(
    () => analyzeSkillGap({ targetRole: "Backend Engineer", currentLevel: "junior" }),
    (err: unknown) => {
      assert.ok(err instanceof AICareerError);
      assert.equal((err as AICareerError).code, "INVALID_RESPONSE_SCHEMA");
      return true;
    }
  );
});

test("a truncated JSON response is rejected", async () => {
  resetMock();
  mockState.response = '{"targetRole": "Backend Engineer", "gapSkills": [';

  await assert.rejects(
    () => generateRoadmap({ targetRole: "Backend Engineer", currentLevel: "junior" }),
    (err: unknown) => {
      assert.ok(err instanceof AICareerError);
      assert.equal((err as AICareerError).code, "INVALID_RESPONSE_SCHEMA");
      return true;
    }
  );
});

test("a successful call after a failed one still works", async () => {
  resetMock();
  mockState.error = new AICareerError("transient failure", "AI_REQUEST_FAILED");

  await assert.rejects(() =>
    analyzeSkillGap({ targetRole: "Backend Engineer", currentLevel: "junior" })
  );

  // The stub is reconfigured — the module must not be left in a broken state.
  mockState.error = null;
  mockState.response = JSON.stringify({
    targetRole: "Backend Engineer",
    currentLevel: "junior",
    gapSkills: [],
    matchedSkills: ["Node.js"],
    overallGapScore: 20,
    gapSummary: "Recovered fine.",
  });

  const result = await analyzeSkillGap({
    targetRole: "Backend Engineer",
    currentLevel: "junior",
  });

  assert.equal(result.gapSummary, "Recovered fine.");
  assert.equal(result.matchedSkills[0], "Node.js");
});
