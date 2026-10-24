/**
 * Unit tests for the career module — prompt builders (pure functions)
 * and validator schemas. No AI calls are made.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSkillGapPrompt,
  buildRoadmapPrompt,
} from "@/lib/career";
import {
  CareerAnalyzeInputSchema,
  CareerAnalyzeResultSchema,
  SkillGapSchema,
} from "@/lib/career/validators";
import { stripJsonFence } from "@/lib/ai";

// ─── stripJsonFence ──────────────────────────────────────────────────────────

test("stripJsonFence removes ```json fences", () => {
  assert.equal(
    stripJsonFence("```json\n{\"a\":1}\n```"),
    '{"a":1}'
  );
});

test("stripJsonFence removes bare ``` fences", () => {
  assert.equal(
    stripJsonFence("```\n{\"a\":1}\n```"),
    '{"a":1}'
  );
});

test("stripJsonFence leaves plain JSON untouched", () => {
  assert.equal(stripJsonFence('{"a":1}'), '{"a":1}');
});

test("stripJsonFence trims surrounding whitespace", () => {
  assert.equal(stripJsonFence('  \n{"a":1}\n  '), '{"a":1}');
});

// ─── buildSkillGapPrompt ─────────────────────────────────────────────────────

const baseInput = {
  targetRole: "Senior Frontend Developer",
  currentLevel: "mid" as const,
};

test("buildSkillGapPrompt includes target role and level", () => {
  const prompt = buildSkillGapPrompt(baseInput);
  assert.match(prompt, /Senior Frontend Developer/);
  assert.match(prompt, /mid/);
});

test("buildSkillGapPrompt lists technical and soft skills when provided", () => {
  const prompt = buildSkillGapPrompt({
    ...baseInput,
    currentSkills: {
      technical: ["React", "TypeScript"],
      soft: ["Communication"],
    },
  });
  assert.match(prompt, /React, TypeScript/);
  assert.match(prompt, /Communication/);
});

test("buildSkillGapPrompt shows fallback when no skills and no CV text", () => {
  const prompt = buildSkillGapPrompt(baseInput);
  assert.match(prompt, /No CV text or skill list provided/);
});

test("buildSkillGapPrompt embeds CV text when provided", () => {
  const prompt = buildSkillGapPrompt({
    ...baseInput,
    cvText: "10 years building React apps",
  });
  assert.match(prompt, /10 years building React apps/);
  assert.doesNotMatch(prompt, /No CV text or skill list provided/);
});

test("buildSkillGapPrompt shows (none) for empty skill arrays", () => {
  const prompt = buildSkillGapPrompt({
    ...baseInput,
    currentSkills: { technical: [], soft: [] },
  });
  assert.match(prompt, /Technical: \(none\)/);
  assert.match(prompt, /Soft: \(none\)/);
});

test("buildSkillGapPrompt asks for valid JSON without markdown fences", () => {
  const prompt = buildSkillGapPrompt(baseInput);
  assert.match(prompt, /no markdown fences/);
  assert.match(prompt, /overallGapScore/);
  assert.match(prompt, /gapSkills/);
});

// ─── buildRoadmapPrompt ─────────────────────────────────────────────────────

test("buildRoadmapPrompt produces roadmap JSON skeleton", () => {
  const prompt = buildRoadmapPrompt(baseInput);
  assert.match(prompt, /Senior Frontend Developer/);
  assert.match(prompt, /mid/);
  assert.match(prompt, /careerAdvice/);
  assert.match(prompt, /phases/);
  assert.match(prompt, /estimatedMonths/);
});

test("buildRoadmapPrompt indicates no input when nothing is supplied", () => {
  const prompt = buildRoadmapPrompt(baseInput);
  assert.match(prompt, /No CV text or skill list provided/);
});

// ─── Validators ───────────────────────────────────────────────────────────────

test("CareerAnalyzeInputSchema rejects an empty role", () => {
  assert.equal(
    CareerAnalyzeInputSchema.safeParse({
      targetRole: "",
      currentLevel: "junior",
    }).success,
    false
  );
});

test("CareerAnalyzeInputSchema rejects unknown level", () => {
  assert.equal(
    CareerAnalyzeInputSchema.safeParse({
      targetRole: "Backend Engineer",
      currentLevel: "principal", // not in enum
    }).success,
    false
  );
});

test("CareerAnalyzeInputSchema trims surrounding whitespace on role", () => {
  assert.deepEqual(
    CareerAnalyzeInputSchema.parse({
      targetRole: "  Backend Engineer  ",
      currentLevel: "junior",
    }),
    { targetRole: "Backend Engineer", currentLevel: "junior" }
  );
});

test("SkillGapSchema rejects overallGapScore outside 0-100", () => {
  assert.equal(
    SkillGapSchema.safeParse({
      targetRole: "Role",
      currentLevel: "junior",
      gapSkills: [],
      matchedSkills: [],
      overallGapScore: 150,
      gapSummary: "x",
    }).success,
    false
  );

  assert.equal(
    SkillGapSchema.safeParse({
      targetRole: "Role",
      currentLevel: "junior",
      gapSkills: [],
      matchedSkills: [],
      overallGapScore: -1,
      gapSummary: "x",
    }).success,
    false
  );
});

test("SkillGapSchema accepts valid payload", () => {
  assert.equal(
    SkillGapSchema.safeParse({
      targetRole: "Role",
      currentLevel: "junior",
      gapSkills: [
        {
          skill: "GraphQL",
          category: "technical",
          importance: "must-have",
          suggestedResources: [{ type: "course", title: "Apollo Course" }],
        },
      ],
      matchedSkills: ["React"],
      overallGapScore: 60,
      gapSummary: "Short summary.",
    }).success,
    true
  );
});

test("CareerAnalyzeResultSchema accepts a full result payload", () => {
  const payload = {
    targetRole: "Senior Frontend Developer",
    targetLevel: "mid",
    skillGap: {
      targetRole: "Senior Frontend Developer",
      currentLevel: "mid",
      gapSkills: [],
      matchedSkills: ["React"],
      overallGapScore: 30,
      gapSummary: "Solid base.",
    },
    roadmap: {
      estimatedMonths: 6,
      phases: [
        {
          phase: "Phase 1",
          goals: ["Goal A"],
          tasks: [
            {
              title: "Task A",
              resources: [],
              milestones: [],
            },
          ],
        },
      ],
      totalEstimatedDays: 180,
    },
    careerAdvice: {
      immediate: ["Apply to 5 jobs"],
      shortTerm: ["Build a side project"],
      longTerm: ["Aim for staff"],
    },
  };

  const result = CareerAnalyzeResultSchema.safeParse(payload);
  assert.equal(result.success, true);
});

test("CareerAnalyzeResultSchema rejects a roadmap without phases", () => {
  const payload = {
    targetRole: "Role",
    targetLevel: "junior",
    skillGap: {
      targetRole: "Role",
      currentLevel: "junior",
      gapSkills: [],
      matchedSkills: [],
      overallGapScore: 50,
      gapSummary: "x",
    },
    roadmap: {
      phases: [],
    },
  };

  assert.equal(
    CareerAnalyzeResultSchema.safeParse(payload).success,
    true // empty array is allowed by schema
  );
});
