/**
 * Integration tests for Career roadmap persistence.
 *
 * These run against the real PostgreSQL database and verify the round trip
 * that unit tests cannot cover:
 *   - a roadmap and its steps are persisted and can be read back
 *   - step progress survives a reload (the acceptance criterion in
 *     plan.md · T8-NA-15: "Roadmap không mất progress sau reload")
 *   - one user cannot read or modify another user's roadmap
 *   - a failed AI call leaves no partial roadmap behind
 *
 * Run with:  npm run test:integration
 *
 * The test creates its own throwaway records and removes them afterwards, so
 * it never touches the seeded demo data.
 */

import "dotenv/config";
import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma";
import { AICareerError, aiInternals } from "@/lib/ai";
import { belongsToUser } from "@/lib/access-control";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const OWNER_EMAIL = "test-career-owner@example.com";
const OTHER_EMAIL = "test-career-other@example.com";
const PASSWORD_HASH = "not-a-real-hash-for-integration-tests";

let ownerId = "";
let otherId = "";
let roadmapId = "";

async function createUser(email: string): Promise<string> {
  const user = await prisma.user.create({
    data: { email, passwordHash: PASSWORD_HASH, fullName: "Test User" },
    select: { id: true },
  });
  return user.id;
}

before(async () => {
  // Clean up leftovers from a previous aborted run.
  await prisma.user.deleteMany({
    where: { email: { in: [OWNER_EMAIL, OTHER_EMAIL] } },
  });

  ownerId = await createUser(OWNER_EMAIL);
  otherId = await createUser(OTHER_EMAIL);
});

after(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: [OWNER_EMAIL, OTHER_EMAIL] } },
  });
  await prisma.$disconnect();
});

// ─── Persistence round trip ──────────────────────────────────────────────────

test("a roadmap and its steps are persisted and read back", async () => {
  const roadmap = await prisma.careerRoadmap.create({
    data: {
      userId: ownerId,
      targetRole: "Integration Test Role",
      targetLevel: "junior",
      currentSkills: { technical: ["TypeScript"], soft: [] },
      missingSkills: ["GraphQL"],
      roadmapJson: {
        targetRole: "Integration Test Role",
        targetLevel: "junior",
        skillGap: {
          targetRole: "Integration Test Role",
          currentLevel: "junior",
          gapSkills: [],
          matchedSkills: ["TypeScript"],
          overallGapScore: 30,
          gapSummary: "Test summary.",
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
                  description: "First task",
                  estimatedDays: 7,
                  resources: [],
                  milestones: [],
                },
                {
                  title: "Task B",
                  description: "Second task",
                  estimatedDays: 5,
                  resources: [],
                  milestones: [],
                },
              ],
            },
          ],
          totalEstimatedDays: 12,
        },
      },
      status: "ACTIVE",
      steps: {
        create: [
          {
            title: "Task A",
            description: "First task",
            orderIndex: 0,
            resources: { phase: "Phase 1" },
            status: "PENDING",
          },
          {
            title: "Task B",
            description: "Second task",
            orderIndex: 1,
            resources: { phase: "Phase 1" },
            status: "PENDING",
          },
        ],
      },
    },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });

  roadmapId = roadmap.id;

  assert.equal(roadmap.targetRole, "Integration Test Role");
  assert.equal(roadmap.steps.length, 2);
  assert.equal(roadmap.steps[0]?.title, "Task A");
  assert.equal(roadmap.steps[0]?.status, "PENDING");

  // Read it back the same way the API does.
  const reloaded = await prisma.careerRoadmap.findFirst({
    where: { id: roadmapId, userId: ownerId },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });

  assert.ok(reloaded);
  assert.equal(reloaded.steps.length, 2);
  assert.equal(reloaded.roadmapJson !== null, true);
});

// ─── Progress survives a reload ──────────────────────────────────────────────

test("step progress survives a reload", async () => {
  const steps = await prisma.roadmapStep.findMany({
    where: { roadmapId },
    orderBy: { orderIndex: "asc" },
  });
  const firstStep = steps[0];
  assert.ok(firstStep);

  await prisma.roadmapStep.update({
    where: { id: firstStep.id },
    data: { status: "COMPLETED" },
  });

  const reloaded = await prisma.roadmapStep.findFirst({
    where: { id: firstStep.id },
  });

  assert.equal(reloaded?.status, "COMPLETED");
});

test("a roadmap listing only returns the current user's roadmaps", async () => {
  const mine = await prisma.careerRoadmap.findMany({
    where: { userId: ownerId },
    select: { id: true, targetRole: true },
  });
  const theirs = await prisma.careerRoadmap.findMany({
    where: { userId: otherId },
    select: { id: true },
  });

  assert.equal(mine.some((r) => r.id === roadmapId), true);
  assert.equal(theirs.some((r) => r.id === roadmapId), false);
});

// ─── Owner scope ─────────────────────────────────────────────────────────────

test("another user cannot read this roadmap", async () => {
  const leaked = await prisma.careerRoadmap.findFirst({
    where: { id: roadmapId, userId: otherId },
  });

  assert.equal(leaked, null);
});

test("another user cannot update this roadmap's steps", async () => {
  const steps = await prisma.roadmapStep.findMany({
    where: { roadmapId },
    orderBy: { orderIndex: "asc" },
  });
  const firstStep = steps[0];
  assert.ok(firstStep);

  const stepWithRoadmap = await prisma.roadmapStep.findFirst({
    where: { id: firstStep.id },
    include: { roadmap: { select: { userId: true } } },
  });

  assert.ok(stepWithRoadmap);
  assert.equal(belongsToUser(stepWithRoadmap.roadmap, ownerId), true);
  assert.equal(belongsToUser(stepWithRoadmap.roadmap, otherId), false);
});

// ─── Failure leaves no partial data ─────────────────────────────────────────

test("a failed AI call does not create a roadmap row", async () => {
  const before = await prisma.careerRoadmap.count({
    where: { userId: ownerId },
  });

  const original = aiInternals.chatCompletion;
  test.mock.method(aiInternals, "chatCompletion", async () => {
    throw new AICareerError("simulated timeout", "AI_REQUEST_FAILED");
  });

  try {
    const { generateRoadmap } = await import("@/lib/career");
    await assert.rejects(
      () =>
        generateRoadmap({
          targetRole: "Should Not Persist",
          currentLevel: "junior",
        })
    );
  } finally {
    test.mock.restoreAll();
    void original;
  }

  const after = await prisma.careerRoadmap.count({
    where: { userId: ownerId },
  });

  assert.equal(after, before);
});

test("a quota failure leaves no partial data and keeps the quota code", async () => {
  const before = await prisma.careerRoadmap.count({
    where: { userId: ownerId },
  });

  const original = aiInternals.chatCompletion;
  test.mock.method(aiInternals, "chatCompletion", async () => {
    throw new AICareerError(
      "Bạn đã dùng hết lượt phân tích AI trong ngày.",
      "AI_QUOTA_EXCEEDED",
      1_700_000_000_000
    );
  });

  try {
    const { generateRoadmap } = await import("@/lib/career");
    await assert.rejects(
      () =>
        generateRoadmap({
          targetRole: "Quota Role",
          currentLevel: "junior",
        }),
      (err: unknown) => {
        assert.ok(err instanceof AICareerError);
        assert.equal((err as AICareerError).code, "AI_QUOTA_EXCEEDED");
        assert.equal((err as AICareerError).resetsAt, 1_700_000_000_000);
        return true;
      }
    );
  } finally {
    test.mock.restoreAll();
    void original;
  }

  const after = await prisma.careerRoadmap.count({
    where: { userId: ownerId },
  });

  assert.equal(after, before);
});

test("the API answers a quota failure with 429 and the reset time", async () => {
  const { aiErrorResponse } = await import("@/lib/utils");

  const response = aiErrorResponse(
    new AICareerError(
      "Bạn đã dùng hết lượt phân tích AI trong ngày.",
      "AI_QUOTA_EXCEEDED",
      1_700_000_000_000
    ),
    "Roadmap generation failed."
  );

  assert.equal(response.status, 429);

  const body = (await response.json()) as {
    error: { code: string; message: string; resetsAt?: number };
  };

  assert.equal(body.error.code, "AI_QUOTA_EXCEEDED");
  assert.equal(body.error.resetsAt, 1_700_000_000_000);
  // The message must stay user-facing — no provider internals.
  assert.doesNotMatch(body.error.message, /RESOURCE_EXHAUSTED/);
  assert.doesNotMatch(body.error.message, /quotaMetric/);
});

test("the API answers an ordinary AI failure with 500", async () => {
  const { aiErrorResponse } = await import("@/lib/utils");

  const response = aiErrorResponse(
    new AICareerError("boom", "AI_REQUEST_FAILED"),
    "Roadmap generation failed."
  );

  assert.equal(response.status, 500);

  const body = (await response.json()) as { error: { code: string } };
  assert.equal(body.error.code, "AI_REQUEST_FAILED");
});

// ─── Skill source persistence ───────────────────────────────────────────────

test("a CV's skills are read back from the skill table", async () => {
  const cv = await prisma.cV.create({
    data: {
      userId: ownerId,
      originalName: "integration-cv.pdf",
      filePath: "uploads/integration-cv.pdf",
      fileType: "application/pdf",
      status: "ANALYZED",
      extractedText: "Some CV text",
      analysisJson: { skills: { technical: ["Ignored"], soft: [] } },
    },
    select: { id: true },
  });

  const technical = await prisma.skill.create({
    data: { name: `Integration Skill ${Date.now()}`, category: "technical" },
    select: { id: true, name: true },
  });
  const soft = await prisma.skill.create({
    data: { name: `Integration Soft ${Date.now()}`, category: "soft" },
    select: { id: true, name: true },
  });

  await prisma.cVSkill.createMany({
    data: [
      { cvId: cv.id, skillId: technical.id },
      { cvId: cv.id, skillId: soft.id },
    ],
  });

  const { resolveCvSkills } = await import("@/lib/career/skill-repository");
  const resolved = await resolveCvSkills({
    id: cv.id,
    analysisJson: { skills: { technical: ["Ignored"], soft: [] } },
  });

  assert.equal(resolved.origin, "skill-table");
  assert.equal(resolved.skills.technical.includes(technical.name), true);
  assert.equal(resolved.skills.soft.includes(soft.name), true);
  // The skill table wins over the legacy analysisJson payload.
  assert.equal(resolved.skills.technical.includes("Ignored"), false);

  await prisma.cV.delete({ where: { id: cv.id } });
  await prisma.skill.deleteMany({
    where: { id: { in: [technical.id, soft.id] } },
  });
});

// ─── Inferred skills (no CV, no manual skill list) ──────────────────────────

test("a roadmap can be generated from the level alone, with no CV or skills", async () => {
  const { generateRoadmap } = await import("@/lib/career");

  const original = aiInternals.chatCompletion;
  let capturedPrompt = "";
  test.mock.method(aiInternals, "chatCompletion", async (params: { userMessage: string }) => {
    capturedPrompt = params.userMessage;
    return JSON.stringify({
      targetRole: "Kế toán trưởng",
      targetLevel: "lead",
      skillGap: {
        targetRole: "Kế toán trưởng",
        currentLevel: "junior",
        gapSkills: [
          {
            skill: "Lập Báo cáo tài chính quản trị",
            category: "technical",
            importance: "must-have",
            reason: "Cần cho vị trí trưởng bộ phận.",
            suggestedResources: [],
          },
        ],
        matchedSkills: ["Hạch toán cơ bản"],
        overallGapScore: 75,
        gapSummary: "Dựa trên tiêu chuẩn junior, bạn còn thiếu kỹ năng quản trị.",
      },
      roadmap: {
        estimatedMonths: 12,
        phases: [
          {
            phase: "Phase 1: Nền tảng quản trị",
            goals: ["Nắm vững BCTC quản trị"],
            tasks: [
              {
                title: "Học lập BCTC quản trị",
                description: "Khóa học cho kế toán trưởng",
                estimatedDays: 30,
                resources: [],
                milestones: [],
              },
            ],
          },
        ],
        totalEstimatedDays: 180,
      },
      careerAdvice: { immediate: ["Học BCTC"], shortTerm: [], longTerm: [] },
    });
  });

  try {
    // No cvId, no currentSkills — the AI has to infer from the level.
    const result = await generateRoadmap({
      targetRole: "Kế toán trưởng",
      currentLevel: "junior",
      targetLevel: "lead",
    });

    assert.equal(result.targetLevel, "lead");
    assert.equal(result.skillGap.currentLevel, "junior");
    assert.equal(result.skillGap.gapSkills.length, 1);

    // The prompt must tell the AI to infer a profile from the level.
    assert.match(capturedPrompt, /INFER a realistic skill profile/i);
    assert.match(capturedPrompt, /"lead"/);
    assert.match(capturedPrompt, /"junior"/);
  } finally {
    test.mock.restoreAll();
    void original;
  }
});

test("a roadmap without a target level falls back to the current level", async () => {
  const { generateRoadmap } = await import("@/lib/career");

  const original = aiInternals.chatCompletion;
  test.mock.method(aiInternals, "chatCompletion", async () =>
    JSON.stringify({
      targetRole: "Fallback Role",
      skillGap: {
        targetRole: "Fallback Role",
        currentLevel: "mid",
        gapSkills: [],
        matchedSkills: [],
        overallGapScore: 20,
        gapSummary: "Tóm tắt",
      },
      roadmap: { phases: [] },
    })
  );

  try {
    const result = await generateRoadmap({
      targetRole: "Fallback Role",
      currentLevel: "mid",
    });

    assert.equal(result.targetLevel, "mid");
  } finally {
    test.mock.restoreAll();
    void original;
  }
});

test("a roadmap persists the requested target level", async () => {
  const roadmap = await prisma.careerRoadmap.create({
    data: {
      userId: ownerId,
      targetRole: "Persisted Target Level",
      targetLevel: "lead",
      currentSkills: Prisma.JsonNull,
    },
    select: { id: true, targetLevel: true },
  });

  const reloaded = await prisma.careerRoadmap.findUnique({
    where: { id: roadmap.id },
    select: { targetLevel: true },
  });

  assert.equal(reloaded?.targetLevel, "lead");

  await prisma.careerRoadmap.delete({ where: { id: roadmap.id } });
});
