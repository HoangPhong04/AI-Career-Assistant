/**
 * Roadmap progress tracking — pure helpers.
 *
 * Kept out of the UI components so the progress rules can be unit tested
 * (plan.md · NFR-04: no business logic inside UI components).
 */

import { RoadmapProgressSchema } from "./validators";
import type { RoadmapProgress } from "./validators";

/** The skill buckets sent to the AI. */
export type SkillPayload = {
  technical: string[];
  soft: string[];
};

/** A CV option as rendered in the Career form's dropdown. */
export type SelectableCv = {
  id: string;
  skills: {
    technical: string[];
    soft: string[];
  };
};

/** A roadmap step as far as progress tracking is concerned. */
export type ProgressStep = {
  id: string;
  status: string;
  orderIndex?: number;
  title?: string;
  /** The gap skill this step closes, if the roadmap records the link. */
  addressesSkill?: string | null;
};

/** Statuses that count towards the completion percentage. */
export const COMPLETED_STATUS = "COMPLETED";

/**
 * The status a step moves to when the user clicks it.
 * PENDING → IN_PROGRESS → COMPLETED → PENDING, SKIPPED → PENDING.
 */
export function nextStepStatus(current: string): string {
  switch (current) {
    case "PENDING":
      return "IN_PROGRESS";
    case "IN_PROGRESS":
      return "COMPLETED";
    case "COMPLETED":
      return "PENDING";
    case "SKIPPED":
      return "PENDING";
    default:
      return "IN_PROGRESS";
  }
}

/**
 * Count completed steps and derive the completion percentage.
 * An empty roadmap is 0% rather than NaN.
 */
export function summarizeProgress(steps: ProgressStep[]): {
  completed: number;
  total: number;
  percent: number;
} {
  const total = steps.length;
  const completed = steps.filter((step) => step.status === COMPLETED_STATUS).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}

/**
 * Match the skill a task claims to address against the real gap skills.
 *
 * The AI is asked to copy the skill name verbatim, but it sometimes
 * paraphrases it. A link is only kept when it clearly points at one of the
 * gap skills — an unmatched value would create a step that can never move
 * the "skills addressed" counter.
 *
 * Returns the canonical gap-skill name, or null when there is no match.
 */
export function resolveAddressedSkill(
  claimed: string | undefined | null,
  gapSkills: string[]
): string | null {
  if (!claimed || !claimed.trim()) return null;
  if (gapSkills.length === 0) return null;

  const normalize = (value: string) => value.trim().toLowerCase();
  const target = normalize(claimed);

  // Exact match (case-insensitive) — the normal case.
  const exact = gapSkills.find((skill) => normalize(skill) === target);
  if (exact) return exact;

  // A gap skill often reads as "Title (Parentheses, details)". The AI may
  // quote only the headline part, so compare against that too.
  const headline = (skill: string) =>
    normalize(skill.split("(")[0] ?? skill);
  const byHeadline = gapSkills.find((skill) => headline(skill) === target);
  if (byHeadline) return byHeadline;

  // Last resort: one name contains the other. Guarded by a length check so
  // short, generic words do not match everything. The shorter string must
  // be long enough to be a meaningful technology term.
  if (target.length >= 6) {
    const contained = gapSkills.find((skill) => {
      const norm = normalize(skill);
      const head = headline(skill);
      return norm.includes(target) || target.includes(head);
    });
    if (contained) return contained;
  }

  return null;
}

/**
 * How many of the missing skills the user has already tackled.
 *
 * A gap skill counts as "addressed" once at least one step that targets it
 * is completed. Steps without an `addressesSkill` link cannot be attributed
 * to any skill, so they never move this number — the UI reports them
 * separately so the progress stays honest.
 *
 * Returns null when the roadmap does not track the link at all (older
 * roadmaps), because "0 of 6" would be misleading there.
 */
export function summarizeAddressedSkills(
  steps: ProgressStep[],
  gapSkills: string[]
): { addressed: number; total: number; percent: number } | null {
  if (gapSkills.length === 0) return null;

  const linked = steps.filter((step) => step.addressesSkill);
  if (linked.length === 0) return null;

  // A skill counts as addressed when a completed step targets it. The
  // comparison is case-insensitive because the AI may capitalise differently
  // between the gap list and the task list.
  const normalize = (value: string) => value.trim().toLowerCase();
  const completedTargets = new Set(
    steps
      .filter((step) => step.status === COMPLETED_STATUS && step.addressesSkill)
      .map((step) => normalize(step.addressesSkill as string))
  );

  const addressed = gapSkills.filter((skill) =>
    completedTargets.has(normalize(skill))
  ).length;

  return {
    addressed,
    total: gapSkills.length,
    percent: Math.round((addressed / gapSkills.length) * 100),
  };
}

/**
 * Estimate the remaining gap by reducing the original score in proportion to
 * the gap skills marked as addressed. This reflects roadmap progress, not a
 * reassessment of the user's actual proficiency.
 */
export function estimateRemainingGapScore(
  initialGapScore: number,
  progress: { addressed: number; total: number } | null
): number {
  if (!progress || progress.total === 0) return initialGapScore;

  const remainingSkills = Math.max(0, progress.total - progress.addressed);
  return Math.round(initialGapScore * (remainingSkills / progress.total));
}

/**
 * Build the full progress payload for a roadmap, validated against
 * `RoadmapProgressSchema`. Returns null when the roadmap has no steps.
 */
export function buildRoadmapProgress(
  roadmapId: string,
  steps: ProgressStep[]
): RoadmapProgress | null {
  if (steps.length === 0) return null;

  const { completed, total, percent } = summarizeProgress(steps);

  const parsed = RoadmapProgressSchema.safeParse({
    roadmapId,
    totalSteps: total,
    completedSteps: completed,
    percentComplete: percent,
    steps: steps.map((step) => ({
      id: step.id,
      title: step.title ?? "",
      status: step.status,
      orderIndex: step.orderIndex ?? 0,
    })),
  });

  return parsed.success ? parsed.data : null;
}

/**
 * Build the hint shown above the Career form.
 *
 * Three distinct states, each with its own message:
 *  - a CV is selected      → how many skills will be used
 *  - CVs exist but none is selected → invite the user to pick one, or let
 *    the AI infer from the level
 *  - no CV at all           → the AI infers from the level; suggest a CV
 */
export function cvSelectionHint(
  selectedCvId: string,
  selectedSkillCount: number,
  availableCvCount: number
): string {
  if (selectedCvId) {
    return `Kỹ năng sẽ được lấy từ CV đã phân tích (${selectedSkillCount} kỹ năng).`;
  }

  if (availableCvCount > 0) {
    return `Bạn có ${availableCvCount} CV đã phân tích. Chọn một CV để AI dùng kỹ năng thật, hoặc để AI tự suy luận kỹ năng từ cấp bậc hiện tại.`;
  }

  return "Chưa có CV đã phân tích. AI sẽ tự suy luận kỹ năng dựa trên cấp bậc hiện tại — thêm CV để có kết quả chính xác hơn.";
}

/**
 * Resolve the skills that are sent to the AI.
 *
 * With a CV selected we forward the skills resolved from the `skill` ⨝
 * `cv_skill` tables. Without a CV we send nothing — the AI then infers a
 * realistic skill profile from the candidate's current level and target role.
 *
 * Returns undefined when there is nothing to send, so the caller can tell
 * "no skills" apart from "empty skill list".
 */
export function resolveSkillPayload(
  cv: SelectableCv | undefined
): SkillPayload | undefined {
  if (!cv) return undefined;

  const technical = cv.skills?.technical ?? [];
  const soft = cv.skills?.soft ?? [];

  // A CV with no usable skills is treated as "no skills" — the AI infers.
  if (technical.length === 0 && soft.length === 0) return undefined;

  return { technical, soft };
}

/**
 * The skill-gap analysis always has enough to work with: a target role and
 * a current level. Skills are optional — the AI infers them when missing.
 *
 * Kept as a separate function so the rule stays unit-testable and the form
 * can show a clear message if the role is missing.
 */
export function validateRoleInput(targetRole: string): string | null {
  if (!targetRole.trim()) {
    return "Hãy nhập vai trò mục tiêu.";
  }

  return null;
}
