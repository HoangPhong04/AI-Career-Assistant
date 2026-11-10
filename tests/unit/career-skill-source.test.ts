/**
 * Unit tests for the Career skill source (`lib/career/skill-repository`).
 *
 * These cover the pure helpers that decide how a skill is categorised and
 * how skills are read from the legacy `analysisJson` payload. The database
 * access path is exercised through the shared `skill` ⨝ `cv_skill` contract
 * asserted in `career-roadmap.test.ts`.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  getSkillsFromAnalysisJson,
  normalizeSkillCategory,
} from "@/lib/career";

// ─── normalizeSkillCategory ──────────────────────────────────────────────────

test("normalizeSkillCategory maps technical variants", () => {
  assert.equal(normalizeSkillCategory("technical"), "technical");
  assert.equal(normalizeSkillCategory("TECHNICAL"), "technical");
  assert.equal(normalizeSkillCategory("tech"), "technical");
  assert.equal(normalizeSkillCategory("hard_skill"), "technical");
});

test("normalizeSkillCategory maps soft variants", () => {
  assert.equal(normalizeSkillCategory("soft"), "soft");
  assert.equal(normalizeSkillCategory("Soft"), "soft");
  assert.equal(normalizeSkillCategory("soft_skill"), "soft");
  assert.equal(normalizeSkillCategory("soft skills"), "soft");
});

test("normalizeSkillCategory returns null for unknown or empty values", () => {
  assert.equal(normalizeSkillCategory(null), null);
  assert.equal(normalizeSkillCategory(undefined), null);
  assert.equal(normalizeSkillCategory(""), null);
  assert.equal(normalizeSkillCategory("   "), null);
  assert.equal(normalizeSkillCategory("language"), null);
});

// ─── getSkillsFromAnalysisJson ───────────────────────────────────────────────

test("getSkillsFromAnalysisJson reads technical and soft skills", () => {
  const result = getSkillsFromAnalysisJson({
    skills: {
      technical: ["React", "Node.js"],
      soft: ["Communication"],
    },
  });

  assert.ok(result);
  assert.deepEqual(result.technical, ["React", "Node.js"]);
  assert.deepEqual(result.soft, ["Communication"]);
});

test("getSkillsFromAnalysisJson dedupes case-insensitively", () => {
  const result = getSkillsFromAnalysisJson({
    skills: {
      technical: ["React", "react", "REACT"],
      soft: [],
    },
  });

  assert.ok(result);
  assert.deepEqual(result.technical, ["React"]);
});

test("getSkillsFromAnalysisJson trims whitespace and drops empty entries", () => {
  const result = getSkillsFromAnalysisJson({
    skills: {
      technical: ["  React  ", "", "   "],
      soft: [],
    },
  });

  assert.ok(result);
  assert.deepEqual(result.technical, ["React"]);
});

test("getSkillsFromAnalysisJson returns null when the payload has no skills", () => {
  assert.equal(getSkillsFromAnalysisJson(null), null);
  assert.equal(getSkillsFromAnalysisJson(undefined), null);
  assert.equal(getSkillsFromAnalysisJson("string"), null);
  assert.equal(getSkillsFromAnalysisJson({}), null);
  assert.equal(getSkillsFromAnalysisJson({ skills: null }), null);
  assert.equal(
    getSkillsFromAnalysisJson({ skills: { technical: [], soft: [] } }),
    null
  );
});

test("getSkillsFromAnalysisJson ignores non-string skill entries", () => {
  const result = getSkillsFromAnalysisJson({
    skills: {
      technical: ["React", 42, null, { name: "Ghost" }],
      soft: [],
    },
  });

  assert.ok(result);
  assert.deepEqual(result.technical, ["React"]);
});
