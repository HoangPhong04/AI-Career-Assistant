/**
 * Unit tests for analyzeSkillGap / generateRoadmap with a mocked AI client.
 *
 * Strategy: `lib/ai` exports an `aiInternals` object whose `chatCompletion`
 * method is the one called by the career module. We use Node's `t.mock.method`
 * to swap that method with a stub. Per-test, we set the `mockState` global
 * (held outside the closure) to control what the stub returns.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { AICareerError, aiInternals } from "@/lib/ai";
import * as career from "@/lib/career";

// ─── Stub state (mutated by individual tests) ────────────────────────────────

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

// ─── analyzeSkillGap ─────────────────────────────────────────────────────────

test("analyzeSkillGap returns parsed skill gap on valid AI JSON", async () => {
  resetMock();
  mockState.response = JSON.stringify({
    targetRole: "Backend Engineer",
    currentLevel: "junior",
    gapSkills: [
      {
        skill: "PostgreSQL",
        category: "technical",
        importance: "must-have",
        reason: "Most backend roles require it.",
        suggestedResources: [
          { type: "course", title: "Postgres for Developers" },
        ],
      },
    ],
    matchedSkills: ["Node.js"],
    overallGapScore: 45,
    gapSummary: "You're close — focus on DB depth.",
  });

  const result = await career.analyzeSkillGap({
    targetRole: "Backend Engineer",
    currentLevel: "junior",
  });

  assert.equal(mockState.callCount, 1);
  assert.equal(result.targetRole, "Backend Engineer");
  assert.equal(result.currentLevel, "junior");
  assert.equal(result.overallGapScore, 45);
  assert.equal(result.gapSkills.length, 1);
  assert.equal(result.gapSkills[0]?.skill, "PostgreSQL");
  assert.equal(result.matchedSkills[0], "Node.js");
});

test("analyzeSkillGap accepts fenced JSON from AI", async () => {
  resetMock();
  mockState.response =
    "```json\n" +
    JSON.stringify({
      targetRole: "DevOps Engineer",
      currentLevel: "mid",
      gapSkills: [],
      matchedSkills: ["Docker"],
      overallGapScore: 20,
      gapSummary: "Solid fundamentals.",
    }) +
    "\n```";

  const result = await career.analyzeSkillGap({
    targetRole: "DevOps Engineer",
    currentLevel: "mid",
  });

  assert.equal(result.targetRole, "DevOps Engineer");
  assert.equal(result.gapSkills.length, 0);
});

test("analyzeSkillGap throws AICareerError when input is invalid", async () => {
  resetMock();
  await assert.rejects(
    () =>
      career.analyzeSkillGap({
        targetRole: "",
        currentLevel: "junior",
      }),
    (err: unknown) => {
      assert.ok(err instanceof AICareerError);
      assert.equal((err as AICareerError).code, "INVALID_RESPONSE_SCHEMA");
      return true;
    }
  );
});

test("analyzeSkillGap throws AICareerError when AI returns malformed JSON", async () => {
  resetMock();
  mockState.response = "not json at all { broken";

  await assert.rejects(
    () =>
      career.analyzeSkillGap({
        targetRole: "Frontend Engineer",
        currentLevel: "junior",
      }),
    (err: unknown) => {
      assert.ok(err instanceof AICareerError);
      assert.equal((err as AICareerError).code, "INVALID_RESPONSE_SCHEMA");
      return true;
    }
  );
});

test("analyzeSkillGap throws when AI response does not match schema", async () => {
  resetMock();
  mockState.response = JSON.stringify({
    // overallGapScore intentionally missing
    targetRole: "Role",
    currentLevel: "junior",
    gapSkills: [],
    matchedSkills: [],
    gapSummary: "x",
  });

  await assert.rejects(
    () =>
      career.analyzeSkillGap({
        targetRole: "Role",
        currentLevel: "junior",
      }),
    (err: unknown) => {
      assert.ok(err instanceof AICareerError);
      assert.equal((err as AICareerError).code, "INVALID_RESPONSE_SCHEMA");
      return true;
    }
  );
});

test("analyzeSkillGap propagates AICareerError from AI layer", async () => {
  resetMock();
  mockState.error = new AICareerError("upstream boom", "AI_REQUEST_FAILED");

  await assert.rejects(
    () =>
      career.analyzeSkillGap({
        targetRole: "Role",
        currentLevel: "junior",
      }),
    (err: unknown) => {
      assert.ok(err instanceof AICareerError);
      assert.equal((err as AICareerError).code, "AI_REQUEST_FAILED");
      assert.match((err as Error).message, /upstream boom/);
      return true;
    }
  );
});

// ─── generateRoadmap ─────────────────────────────────────────────────────────

test("generateRoadmap returns parsed roadmap with phases and advice", async () => {
  resetMock();
  mockState.response = JSON.stringify({
    targetRole: "Fullstack Engineer",
    targetLevel: "mid",
    skillGap: {
      targetRole: "Fullstack Engineer",
      currentLevel: "mid",
      gapSkills: [],
      matchedSkills: ["TypeScript"],
      overallGapScore: 25,
      gapSummary: "On track.",
    },
    roadmap: {
      estimatedMonths: 6,
      phases: [
        {
          phase: "Phase 1: Foundations",
          goals: ["Master core web fundamentals"],
          tasks: [
            {
              title: "Build a CRUD app",
              description: "Ship a small fullstack project.",
              estimatedDays: 14,
              resources: [{ type: "project", title: "Personal CRM" }],
              milestones: ["Deployed to Vercel"],
            },
          ],
        },
        {
          phase: "Phase 2: Production",
          goals: ["Add auth and tests"],
          tasks: [
            {
              title: "Add JWT auth",
              estimatedDays: 7,
              resources: [],
              milestones: ["Login flow works"],
            },
          ],
        },
      ],
      totalEstimatedDays: 120,
    },
    careerAdvice: {
      immediate: ["Polish LinkedIn"],
      shortTerm: ["Apply to 10 roles"],
      longTerm: ["Aim for senior"],
    },
  });

  const result = await career.generateRoadmap({
    targetRole: "Fullstack Engineer",
    currentLevel: "mid",
  });

  assert.equal(result.targetRole, "Fullstack Engineer");
  assert.equal(result.roadmap.estimatedMonths, 6);
  assert.equal(result.roadmap.phases.length, 2);

  const firstPhase = result.roadmap.phases[0];
  assert.ok(firstPhase);
  assert.equal(firstPhase.tasks.length, 1);
  assert.equal(firstPhase.tasks[0]?.title, "Build a CRUD app");

  assert.ok(result.careerAdvice);
  assert.equal(result.careerAdvice?.immediate.length, 1);
  assert.equal(result.careerAdvice?.longTerm[0], "Aim for senior");
});

test("generateRoadmap throws on invalid input", async () => {
  resetMock();
  await assert.rejects(
    () =>
      career.generateRoadmap({
        targetRole: "Valid Role",
        // @ts-expect-error: testing runtime rejection of an invalid level value
        currentLevel: "principal",
      }),
    (err: unknown) => {
      assert.ok(err instanceof AICareerError);
      return true;
    }
  );
});

test("generateRoadmap throws when AI returns invalid JSON", async () => {
  resetMock();
  mockState.response = "{ broken";

  await assert.rejects(
    () =>
      career.generateRoadmap({
        targetRole: "Role",
        currentLevel: "junior",
      }),
    (err: unknown) => {
      assert.ok(err instanceof AICareerError);
      assert.equal((err as AICareerError).code, "INVALID_RESPONSE_SCHEMA");
      return true;
    }
  );
});
