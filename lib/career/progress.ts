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
