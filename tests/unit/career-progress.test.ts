/**
 * Unit tests for roadmap progress tracking (`lib/career/progress`).
 *
 * Covers the status cycle, the completion percentage and the shape of the
 * progress payload that the PATCH endpoint produces.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRoadmapProgress,
  cvSelectionHint,
  nextStepStatus,
  summarizeProgress,
} from "@/lib/career";
import { RoadmapStepUpdateSchema } from "@/lib/career/validators";

// ─── nextStepStatus ──────────────────────────────────────────────────────────

test("nextStepStatus cycles PENDING → IN_PROGRESS → COMPLETED → PENDING", () => {
  assert.equal(nextStepStatus("PENDING"), "IN_PROGRESS");
  assert.equal(nextStepStatus("IN_PROGRESS"), "COMPLETED");
  assert.equal(nextStepStatus("COMPLETED"), "PENDING");
});

test("nextStepStatus returns SKIPPED steps to PENDING", () => {
  assert.equal(nextStepStatus("SKIPPED"), "PENDING");
});

test("nextStepStatus falls back to IN_PROGRESS for unknown statuses", () => {
  assert.equal(nextStepStatus("SOMETHING_ELSE"), "IN_PROGRESS");
  assert.equal(nextStepStatus(""), "IN_PROGRESS");
});

// ─── summarizeProgress ───────────────────────────────────────────────────────

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";
const UUID_C = "33333333-3333-4333-8333-333333333333";

test("summarizeProgress counts only COMPLETED steps", () => {
  const result = summarizeProgress([
    { id: UUID_A, status: "COMPLETED" },
    { id: UUID_B, status: "COMPLETED" },
    { id: UUID_C, status: "IN_PROGRESS" },
  ]);

  assert.equal(result.completed, 2);
  assert.equal(result.total, 3);
  assert.equal(result.percent, 67);
});

test("summarizeProgress treats SKIPPED and PENDING as incomplete", () => {
  const result = summarizeProgress([
    { id: UUID_A, status: "SKIPPED" },
    { id: UUID_B, status: "PENDING" },
    { id: UUID_C, status: "IN_PROGRESS" },
  ]);

  assert.equal(result.completed, 0);
  assert.equal(result.percent, 0);
});

test("summarizeProgress returns 0% for an empty roadmap instead of NaN", () => {
  const result = summarizeProgress([]);

  assert.equal(result.completed, 0);
  assert.equal(result.total, 0);
  assert.equal(result.percent, 0);
  assert.ok(Number.isFinite(result.percent));
});

test("summarizeProgress returns 100% when every step is completed", () => {
  const result = summarizeProgress([
    { id: UUID_A, status: "COMPLETED" },
    { id: UUID_B, status: "COMPLETED" },
  ]);

  assert.equal(result.percent, 100);
});

test("summarizeProgress rounds to the nearest whole percent", () => {
  const result = summarizeProgress([
    { id: UUID_A, status: "COMPLETED" },
    { id: UUID_B, status: "PENDING" },
    { id: UUID_C, status: "PENDING" },
  ]);

  // 1/3 = 33.33… → 33
  assert.equal(result.percent, 33);
});

// ─── buildRoadmapProgress ────────────────────────────────────────────────────

test("buildRoadmapProgress returns null when the roadmap has no steps", () => {
  assert.equal(buildRoadmapProgress(UUID_A, []), null);
});

test("buildRoadmapProgress builds a payload matching the schema", () => {
  const progress = buildRoadmapProgress(UUID_A, [
    { id: UUID_A, status: "COMPLETED", title: "Task A", orderIndex: 0 },
    { id: UUID_B, status: "PENDING", title: "Task B", orderIndex: 1 },
  ]);

  assert.ok(progress);
  assert.equal(progress.roadmapId, UUID_A);
  assert.equal(progress.totalSteps, 2);
  assert.equal(progress.completedSteps, 1);
  assert.equal(progress.percentComplete, 50);
  assert.equal(progress.steps.length, 2);
  assert.equal(progress.steps[0]?.title, "Task A");
  assert.equal(progress.steps[1]?.status, "PENDING");
});

test("buildRoadmapProgress falls back to empty title and zero order index", () => {
  const progress = buildRoadmapProgress(UUID_A, [
    { id: UUID_A, status: "PENDING" },
  ]);

  assert.ok(progress);
  assert.equal(progress.steps[0]?.title, "");
  assert.equal(progress.steps[0]?.orderIndex, 0);
});

// ─── RoadmapStepUpdateSchema (progress update contract) ──────────────────────

test("RoadmapStepUpdateSchema accepts a valid step status update", () => {
  const parsed = RoadmapStepUpdateSchema.safeParse({
    stepId: UUID_A,
    status: "COMPLETED",
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.stepId, UUID_A);
    assert.equal(parsed.data.status, "COMPLETED");
  }
});

test("RoadmapStepUpdateSchema accepts optional notes", () => {
  const parsed = RoadmapStepUpdateSchema.safeParse({
    stepId: UUID_A,
    status: "IN_PROGRESS",
    notes: "Đang học TypeScript",
  });

  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.notes, "Đang học TypeScript");
});

test("RoadmapStepUpdateSchema rejects a non-uuid step id", () => {
  assert.equal(
    RoadmapStepUpdateSchema.safeParse({ stepId: "not-a-uuid", status: "COMPLETED" })
      .success,
    false
  );
});

test("RoadmapStepUpdateSchema rejects an unknown status", () => {
  assert.equal(
    RoadmapStepUpdateSchema.safeParse({ stepId: UUID_A, status: "DONE" }).success,
    false
  );
});

test("RoadmapStepUpdateSchema rejects a missing step id", () => {
  assert.equal(
    RoadmapStepUpdateSchema.safeParse({ status: "COMPLETED" }).success,
    false
  );
});

// ─── cvSelectionHint ─────────────────────────────────────────────────────────

test("cvSelectionHint shows the skill count when a CV is selected", () => {
  const hint = cvSelectionHint(UUID_A, 33, 1);

  assert.match(hint, /33 kỹ năng/);
  assert.doesNotMatch(hint, /Chưa có CV/);
});

test("cvSelectionHint invites the user to pick a CV when some exist", () => {
  const hint = cvSelectionHint("", 0, 1);

  assert.match(hint, /Bạn có 1 CV đã phân tích/);
  assert.match(hint, /chọn một CV/i);
  assert.doesNotMatch(hint, /Chưa có CV/);
});

test("cvSelectionHint pluralises the CV count", () => {
  assert.match(cvSelectionHint("", 0, 3), /Bạn có 3 CV đã phân tích/);
});

test("cvSelectionHint suggests uploading when there is no CV at all", () => {
  const hint = cvSelectionHint("", 0, 0);

  assert.match(hint, /Chưa có CV đã phân tích/);
  assert.match(hint, /tự suy luận kỹ năng/i);
});

test("cvSelectionHint prefers the selected CV over the available count", () => {
  // Even with several CVs available, a selected CV wins.
  const hint = cvSelectionHint(UUID_A, 9, 5);

  assert.match(hint, /9 kỹ năng/);
  assert.doesNotMatch(hint, /Bạn có 5 CV/);
});

test("cvSelectionHint points to AI inference when no CV is picked", () => {
  const hint = cvSelectionHint("", 0, 2);

  assert.match(hint, /AI tự suy luận kỹ năng từ cấp bậc hiện tại/i);
});
