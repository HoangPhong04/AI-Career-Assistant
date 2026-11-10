/**
 * Skill source for the Career Roadmap module.
 * Fallback order:
 *   1. `skill` ⨝ `cv_skill` for the selected CV  →  canonical
 *   2. `analysisJson.skills` on the CV             →  legacy CVs scanned
 *      before the `skill` table was populated
 *   3. nothing                                       →  caller falls back to
 *      manual role entry
 */

import { prisma } from "@/lib/prisma";

export type SkillSets = {
  technical: string[];
  soft: string[];
};

export type CvSkillSource = {
  /** The CV the skills were read from, if any. */
  cvId: string | null;
  /** Skills grouped by category. */
  skills: SkillSets;
  /** Where the skills came from — useful for logging and debugging. */
  origin: "skill-table" | "analysis-json" | "none";
  /** True when the CV had no usable skill data at all. */
  isEmpty: boolean;
};

/** Skill categories that count as soft skills. */
const SOFT_CATEGORIES = new Set(["soft", "soft_skill", "softskill", "soft skills"]);

/** Skill categories that count as technical skills. */
const TECHNICAL_CATEGORIES = new Set([
  "technical",
  "tech",
  "technical_skill",
  "technicalskill",
  "hard",
  "hard_skill",
]);

/**
 * Normalise a raw `skill.category` value into "technical" | "soft" | null.
 *
 * The seed script writes "technical"/"soft", but the CV Analyzer creates
 * skills without a category, so anything unknown is treated as technical —
 * that matches the CV contract where `skills.technical` is the primary bucket.
 */
export function normalizeSkillCategory(
  category: string | null | undefined
): "technical" | "soft" | null {
  if (!category) return null;
  const value = category.trim().toLowerCase();
  if (!value) return null;
  if (SOFT_CATEGORIES.has(value)) return "soft";
  if (TECHNICAL_CATEGORIES.has(value)) return "technical";
  return null;
}

/**
 * Read the skills of a CV from the `skill` ⨝ `cv_skill` tables.
 * Returns null when the CV has no rows in `cv_skill` (i.e. the scanner has
 * not populated the skill table for this CV yet).
 */
export async function getSkillsFromSkillTable(
  cvId: string
): Promise<SkillSets | null> {
  const rows = await prisma.cVSkill.findMany({
    where: { cvId },
    select: {
      skill: { select: { name: true, category: true } },
    },
  });

  if (rows.length === 0) return null;

  const skills: SkillSets = { technical: [], soft: [] };
  const seen = new Set<string>();

  for (const row of rows) {
    const name = row.skill.name?.trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const category = normalizeSkillCategory(row.skill.category);
    if (category === "soft") skills.soft.push(name);
    else skills.technical.push(name);
  }

  return skills;
}

/**
 * Read the skills of a CV from its raw `analysisJson` payload.
 * This is the legacy path used by CVs scanned before the `skill` table
 * was populated by the CV Analyzer.
 */
export function getSkillsFromAnalysisJson(
  analysisJson: unknown
): SkillSets | null {
  if (typeof analysisJson !== "object" || analysisJson === null) return null;

  const skills = (analysisJson as { skills?: unknown }).skills;
  if (typeof skills !== "object" || skills === null) return null;

  const technical = (skills as { technical?: unknown }).technical;
  const soft = (skills as { soft?: unknown }).soft;

  const toNames = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];

    const seen = new Map<string, string>();
    for (const entry of value) {
      if (typeof entry !== "string") continue;
      const name = entry.trim();
      if (!name) continue;

      const key = name.toLowerCase();
      // Keep the first spelling so "React" wins over a later "REACT".
      if (!seen.has(key)) seen.set(key, name);
    }
    return Array.from(seen.values());
  };

  const result: SkillSets = { technical: toNames(technical), soft: toNames(soft) };
  if (result.technical.length === 0 && result.soft.length === 0) return null;
  return result;
}

/**
 * Resolve the skills of a CV, preferring the normalised `skill` table and
 * falling back to the raw analysis payload.
 *
 * @param cv - The CV record with `id`, `analysisJson` and `extractedText`.
 */
export async function resolveCvSkills(
  cv: { id: string; analysisJson: unknown; extractedText?: string | null }
): Promise<CvSkillSource> {
  const fromTable = await getSkillsFromSkillTable(cv.id);
  if (fromTable && (fromTable.technical.length > 0 || fromTable.soft.length > 0)) {
    return { cvId: cv.id, skills: fromTable, origin: "skill-table", isEmpty: false };
  }

  const fromJson = getSkillsFromAnalysisJson(cv.analysisJson);
  if (fromJson) {
    return { cvId: cv.id, skills: fromJson, origin: "analysis-json", isEmpty: false };
  }

  return {
    cvId: cv.id,
    skills: { technical: [], soft: [] },
    origin: "none",
    isEmpty: true,
  };
}

/**
 * List every CV of a user together with the skills resolved from the
 * `skill` table. Used by the Career UI to let the user pick a CV and
 * preview which skills will feed the skill-gap analysis.
 */
export async function listCvsWithSkills(userId: string) {
  const cvs = await prisma.cV.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      originalName: true,
      status: true,
      analysisJson: true,
    },
  });

  const result = [];
  for (const cv of cvs) {
    const resolved = await resolveCvSkills(cv);
    result.push({
      id: cv.id,
      originalName: cv.originalName,
      status: cv.status,
      skills: resolved.skills,
      origin: resolved.origin,
    });
  }
  return result;
}
