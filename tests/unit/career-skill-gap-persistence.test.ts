/**
 * Regression tests for the skill-gap score shown on a saved roadmap.
 *
 * The bug: `POST /api/career/roadmap` only stored the `roadmap` sub-tree of
 * the AI result, so `skillGap` and `careerAdvice` were dropped. The detail
 * page then fell back to `overallGapScore = 0` even though the gap skills
 * were listed — which looked like "0/100 despite having all the skills".
 */

import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRoadmapResponse } from "@/lib/career";
import {
  CareerAnalyzeResultSchema,
  PersistedCareerAnalyzeResultSchema,
  PersistedSkillGapSchema,
} from "@/lib/career/validators";

const input = {
  targetRole: "Embedded Engineer",
  currentLevel: "junior" as const,
  targetLevel: "mid" as const,
};

// ─── The score must survive the round trip ──────────────────────────────────

test("normalizeRoadmapResponse keeps the gap score from a full payload", () => {
  const stored = {
    targetRole: "Embedded Engineer",
    targetLevel: "mid",
    skillGap: {
      targetRole: "Embedded Engineer",
      currentLevel: "junior",
      gapSkills: [
        {
          skill: "FreeRTOS",
          category: "technical" as const,
          importance: "must-have" as const,
          reason: "Cấp Mid cần RTOS.",
          suggestedResources: [],
        },
      ],
      matchedSkills: ["C", "STM32"],
      overallGapScore: 45,
      gapSummary: "Còn thiếu RTOS.",
    },
    roadmap: { phases: [] },
    careerAdvice: { immediate: ["Học RTOS"], shortTerm: [], longTerm: [] },
  };

  const normalized = normalizeRoadmapResponse(stored, input);
  const parsed = PersistedCareerAnalyzeResultSchema.safeParse(normalized);

  assert.equal(parsed.success, true);
  assert.equal(parsed.data?.skillGap.overallGapScore, 45);
  assert.equal(parsed.data?.skillGap.gapSummary, "Còn thiếu RTOS.");
  assert.equal(parsed.data?.careerAdvice?.immediate[0], "Học RTOS");
});

// ─── Legacy rows: score unknown, not zero ───────────────────────────────────

test("normalizeRoadmapResponse reports an unknown score as null, not 0", () => {
  // A row written before the fix: only the roadmap tree was stored.
  const stored = {
    phases: [],
    estimatedMonths: 6,
    totalEstimatedDays: 180,
  };

  const normalized = normalizeRoadmapResponse(
    stored,
    input,
    {
      missingSkills: ["FreeRTOS", "ARM Cortex-M"],
    },
    "persisted"
  );
  const parsed = PersistedCareerAnalyzeResultSchema.safeParse(normalized);

  assert.equal(parsed.success, true);
  assert.equal(
    parsed.data?.skillGap.overallGapScore,
    null,
    "a missing score must not be reported as 0"
  );
  // The skill names still survive through the missingSkills fallback.
  assert.equal(parsed.data?.skillGap.gapSkills.length, 2);
  assert.equal(parsed.data?.skillGap.gapSkills[0]?.skill, "FreeRTOS");
});

test("normalizeRoadmapResponse in AI mode keeps the strict schema valid", () => {
  // The AI path must still satisfy CareerAnalyzeResultSchema, which requires
  // a number and a string — a missing score falls back to 0 there.
  const normalized = normalizeRoadmapResponse({ phases: [] }, input);
  const parsed = CareerAnalyzeResultSchema.safeParse(normalized);

  assert.equal(parsed.success, true);
  assert.equal(parsed.data?.skillGap.overallGapScore, 0);
  assert.equal(typeof parsed.data?.skillGap.gapSummary, "string");
});

test("normalizeRoadmapResponse prefers the dedicated skill gap column", () => {
  // The row has a `skill_gap_json` column even though the stored payload
  // only carries the roadmap tree.
  const stored = { phases: [], estimatedMonths: 6 };

  const normalized = normalizeRoadmapResponse(
    stored,
    input,
    {
      skillGap: {
        targetRole: "Embedded Engineer",
        currentLevel: "junior",
        gapSkills: [],
        matchedSkills: ["C"],
        overallGapScore: 38,
        gapSummary: "Tóm tắt từ cột.",
      },
    },
    "persisted"
  );
  const parsed = PersistedCareerAnalyzeResultSchema.safeParse(normalized);

  assert.equal(parsed.success, true);
  assert.equal(parsed.data?.skillGap.overallGapScore, 38);
  assert.equal(parsed.data?.skillGap.gapSummary, "Tóm tắt từ cột.");
});

test("normalizeRoadmapResponse lets the inline payload win over the column", () => {
  const stored = {
    skillGap: {
      targetRole: "Embedded Engineer",
      currentLevel: "junior",
      gapSkills: [],
      matchedSkills: [],
      overallGapScore: 12,
      gapSummary: "Mới nhất.",
    },
    roadmap: { phases: [] },
  };

  const normalized = normalizeRoadmapResponse(
    stored,
    input,
    {
      skillGap: {
        targetRole: "Embedded Engineer",
        currentLevel: "junior",
        gapSkills: [],
        matchedSkills: [],
        overallGapScore: 99,
        gapSummary: "Cũ.",
      },
    },
    "persisted"
  );
  const parsed = PersistedCareerAnalyzeResultSchema.safeParse(normalized);

  assert.equal(parsed.success, true);
  assert.equal(parsed.data?.skillGap.overallGapScore, 12);
});

// ─── A real zero must stay a real zero ──────────────────────────────────────

test("normalizeRoadmapResponse keeps a genuine zero score", () => {
  const stored = {
    skillGap: {
      targetRole: "Embedded Engineer",
      currentLevel: "mid",
      gapSkills: [],
      matchedSkills: ["C", "STM32", "FreeRTOS"],
      overallGapScore: 0,
      gapSummary: "Bạn đã đủ kỹ năng.",
    },
    roadmap: { phases: [] },
  };

  const normalized = normalizeRoadmapResponse(stored, input);
  const parsed = PersistedCareerAnalyzeResultSchema.safeParse(normalized);

  assert.equal(parsed.success, true);
  assert.equal(parsed.data?.skillGap.overallGapScore, 0);
});

// ─── The persisted schema ───────────────────────────────────────────────────

test("PersistedSkillGapSchema accepts a null score and a null summary", () => {
  const result = PersistedSkillGapSchema.safeParse({
    targetRole: "Role",
    currentLevel: "junior",
    gapSkills: [],
    matchedSkills: [],
    overallGapScore: null,
    gapSummary: null,
  });

  assert.equal(result.success, true);
});

test("PersistedSkillGapSchema still rejects a score outside 0-100", () => {
  const result = PersistedSkillGapSchema.safeParse({
    targetRole: "Role",
    currentLevel: "junior",
    gapSkills: [],
    matchedSkills: [],
    overallGapScore: 150,
    gapSummary: "x",
  });

  assert.equal(result.success, false);
});
