/**
 * Tests for the skill-source flow — the path taken when the user does NOT
 * select a CV.
 *
 * The rule the module follows now: skills are optional. When there is no CV
 * the AI infers a realistic skill profile from the candidate's current level
 * and target role, so the form never blocks on a missing skill list.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveSkillPayload,
  validateRoleInput,
  CareerAnalyzeInputSchema,
} from "@/lib/career";

const CV_WITH_SKILLS = {
  id: "11111111-1111-4111-8111-111111111111",
  skills: {
    technical: ["React", "TypeScript"],
    soft: ["Teamwork"],
  },
};

// ─── resolveSkillPayload ──────────────────────────────────────────────────────

test("resolveSkillPayload uses the selected CV's skills", () => {
  const payload = resolveSkillPayload(CV_WITH_SKILLS);

  assert.deepEqual(payload, {
    technical: ["React", "TypeScript"],
    soft: ["Teamwork"],
  });
});

test("resolveSkillPayload returns undefined when no CV is selected", () => {
  // No CV — the AI infers the skill profile from the level and the role.
  assert.equal(resolveSkillPayload(undefined), undefined);
});

test("resolveSkillPayload treats a CV without skills as no skills", () => {
  const payload = resolveSkillPayload({
    id: "22222222-2222-4222-8222-222222222222",
    skills: { technical: [], soft: [] },
  });

  assert.equal(payload, undefined);
});

test("resolveSkillPayload tolerates a CV with missing skill buckets", () => {
  const payload = resolveSkillPayload({
    id: "33333333-3333-4333-8333-333333333333",
    skills: { technical: ["Go"], soft: [] },
  });

  assert.deepEqual(payload, { technical: ["Go"], soft: [] });
});

// ─── validateRoleInput ───────────────────────────────────────────────────────

test("validateRoleInput accepts a filled role", () => {
  assert.equal(validateRoleInput("Frontend Developer"), null);
});

test("validateRoleInput rejects a blank role", () => {
  const message = validateRoleInput("   ");

  assert.ok(message);
  assert.match(message, /vai trò mục tiêu/i);
});

// ─── CareerAnalyzeInputSchema ────────────────────────────────────────────────

test("CareerAnalyzeInputSchema accepts a role + level with no skills", () => {
  const parsed = CareerAnalyzeInputSchema.safeParse({
    targetRole: "Frontend Developer",
    currentLevel: "junior",
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.currentSkills, undefined);
    assert.equal(parsed.data.targetLevel, undefined);
  }
});

test("CareerAnalyzeInputSchema accepts an explicit target level", () => {
  const parsed = CareerAnalyzeInputSchema.safeParse({
    targetRole: "Frontend Developer",
    currentLevel: "junior",
    targetLevel: "senior",
  });

  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.targetLevel, "senior");
});

test("CareerAnalyzeInputSchema rejects an unknown target level", () => {
  const parsed = CareerAnalyzeInputSchema.safeParse({
    targetRole: "Frontend Developer",
    currentLevel: "junior",
    targetLevel: "expert",
  });

  assert.equal(parsed.success, false);
});

test("CareerAnalyzeInputSchema rejects a missing target role", () => {
  const parsed = CareerAnalyzeInputSchema.safeParse({ currentLevel: "junior" });

  assert.equal(parsed.success, false);
});
