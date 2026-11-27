/**
 * Zod schemas for Career Roadmap & Skill Gap inputs/outputs.
 * These define the contract between CV Analyzer (Bình) and Career Roadmap (Nam Anh).
 */

import { z } from "zod";

// ─── Input schemas ───────────────────────────────────────────────────────────

/** Target career role and the user's current experience level. */
export const CareerAnalyzeInputSchema = z.object({
  targetRole: z
    .string()
    .trim()
    .min(1, "Target role is required")
    .max(100),
  currentLevel: z.enum(["fresher", "junior", "mid", "senior", "lead"], {
    message: "Level must be one of: fresher, junior, mid, senior, lead",
  }),
  /**
   * The level the user wants to reach.
   *
   * When omitted it defaults to `currentLevel` — the AI then infers what a
   * candidate at that level typically looks like and builds the gap from there.
   */
  targetLevel: z
    .enum(["fresher", "junior", "mid", "senior", "lead"])
    .optional(),
  /**
   * Skills extracted from CV by Bình's analyzer.
   *
   * Optional: when the user has no CV and types no skills, the AI infers a
   * realistic skill profile from `currentLevel` + `targetRole` on its own.
   */
  currentSkills: z
    .object({
      technical: z.array(z.string()).default([]),
      soft: z.array(z.string()).default([]),
    })
    .optional(),
  /** Optional CV text for AI to extract skills if currentSkills is absent. */
  cvText: z.string().optional(),
  cvId: z.uuid().optional(),
});
export type CareerAnalyzeInput = z.infer<typeof CareerAnalyzeInputSchema>;

// ─── Output schemas ───────────────────────────────────────────────────────────

export const SkillGapItemSchema = z.object({
  skill: z.string(),
  category: z.enum(["technical", "soft"]).default("technical"),
  importance: z.enum(["must-have", "nice-to-have"]).default("must-have"),
  reason: z.string().optional(),
  suggestedResources: z
    .array(
      z.object({
        type: z.enum(["course", "book", "article", "project", "certification"]),
        title: z.string(),
        url: z.string().url().optional(),
        duration: z.string().optional(),
      })
    )
    .default([]),
});
export type SkillGapItem = z.infer<typeof SkillGapItemSchema>;

export const SkillGapSchema = z.object({
  targetRole: z.string(),
  currentLevel: z.string(),
  gapSkills: z.array(SkillGapItemSchema),
  matchedSkills: z.array(z.string()).default([]),
  overallGapScore: z
    .number()
    .min(0)
    .max(100)
    .describe("0 = no gap, 100 = completely missing all required skills"),
  gapSummary: z.string(),
});
export type SkillGap = z.infer<typeof SkillGapSchema>;

/**
 * The skill gap as it is read back from the database.
 *
 * `overallGapScore` is nullable here: `null` means the score was never
 * captured (a roadmap written before the score was persisted), which is
 * different from `0` — a real score meaning "there is no gap at all".
 * The AI-facing `SkillGapSchema` stays strict so a malformed AI response
 * is still rejected.
 */
export const PersistedSkillGapSchema = SkillGapSchema.extend({
  overallGapScore: z.number().min(0).max(100).nullable(),
  gapSummary: z.string().nullable(),
});
export type PersistedSkillGap = z.infer<typeof PersistedSkillGapSchema>;

export const RoadmapPhaseSchema = z.object({
  phase: z.string().describe("e.g. Phase 1: Foundation (Month 1–2)"),
  goals: z.array(z.string()),
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      estimatedDays: z.number().optional(),
      /**
       * The gap skill this task is meant to close.
       *
       * The value must be copied verbatim from one of the `skillGap.gapSkills`
       * entries so the progress tracker can tell which skills the user has
       * already tackled. Tasks that address no specific gap skill may omit
       * the field.
       */
      addressesSkill: z.string().optional(),
      resources: z
        .array(
          z.object({
            type: z.enum(["course", "book", "article", "project", "certification"]),
            title: z.string(),
            url: z.string().url().optional(),
            duration: z.string().optional(),
          })
        )
        .default([]),
      milestones: z.array(z.string()).default([]),
    })
  ),
});
export type RoadmapPhase = z.infer<typeof RoadmapPhaseSchema>;

export const CareerAnalyzeResultSchema = z.object({
  targetRole: z.string(),
  targetLevel: z.string(),
  skillGap: SkillGapSchema,
  roadmap: z.object({
    estimatedMonths: z.number().optional(),
    phases: z.array(RoadmapPhaseSchema),
    totalEstimatedDays: z.number().optional(),
  }),
  careerAdvice: z
    .object({
      immediate: z.array(z.string()).default([]),
      shortTerm: z.array(z.string()).default([]),
      longTerm: z.array(z.string()).default([]),
    })
    .optional(),
});
export type CareerAnalyzeResult = z.infer<typeof CareerAnalyzeResultSchema>;

/**
 * A roadmap read back from the database.
 *
 * Same shape as `CareerAnalyzeResult`, except the gap score may be `null`
 * for rows written before the score was persisted.
 */
export const PersistedCareerAnalyzeResultSchema = CareerAnalyzeResultSchema.extend({
  skillGap: PersistedSkillGapSchema,
});
export type PersistedCareerAnalyzeResult = z.infer<
  typeof PersistedCareerAnalyzeResultSchema
>;

// ─── Progress tracking schemas ────────────────────────────────────────────────

export const RoadmapStepUpdateSchema = z.object({
  stepId: z.string().uuid(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"]),
  notes: z.string().optional(),
});
export type RoadmapStepUpdate = z.infer<typeof RoadmapStepUpdateSchema>;

export const RoadmapProgressSchema = z.object({
  roadmapId: z.string().uuid(),
  totalSteps: z.number(),
  completedSteps: z.number(),
  percentComplete: z.number().min(0).max(100),
  steps: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      status: z.string(),
      orderIndex: z.number(),
    })
  ),
});
export type RoadmapProgress = z.infer<typeof RoadmapProgressSchema>;
