/**
 * Career Roadmap — skill gap analysis & roadmap generation.
 *
 * Entry points for other modules:
 *  - `analyzeSkillGap(input)`          → SkillGap
 *  - `generateRoadmap(input)`          → CareerAnalyzeResult
 *  - `buildAnalyzePrompt(input)`       → raw AI prompt (for route handlers)
 *
 * This barrel is safe to import from client components. Database-backed
 * helpers live in `./skill-repository` and must be imported directly:
 *   import { resolveCvSkills } from "@/lib/career/skill-repository";
 */

import {
  CareerAnalyzeInputSchema,
  CareerAnalyzeResultSchema,
  SkillGapSchema,
  type CareerAnalyzeInput,
  type CareerAnalyzeResult,
  type SkillGap,
} from "./validators";

import { aiInternals, stripJsonFence, AICareerError, AIAnalysisError } from "@/lib/ai";

// ─── Prompt templates ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are an expert Career Development Advisor and Technical Mentor.
Given a target job role and the candidate's current skill set, you must
respond ONLY with a valid JSON object — no markdown, no extra text.
`.trim();

/**
 * Build the user prompt for skill gap analysis.
 * Called by the route handler so the prompt is auditable in one place.
 */
export function buildSkillGapPrompt(input: CareerAnalyzeInput): string {
  const targetLevel = input.targetLevel ?? input.currentLevel;
  const skills = input.currentSkills
    ? `Current skills:\n  Technical: ${input.currentSkills.technical.join(", ") || "(none)"}\n  Soft: ${input.currentSkills.soft.join(", ") || "(none)"}`
    : input.cvText
    ? `CV text for you to extract current skills:\n"""\n${input.cvText}\n"""`
    : `No CV text or skill list provided.
The candidate has NOT listed their skills, so you must INFER a realistic skill
profile for someone at the "${input.currentLevel}" level in "${input.targetRole}",
then compare it against what the "${targetLevel}" level requires.
State your assumption clearly in "gapSummary" (e.g. "Dựa trên tiêu chuẩn
${input.currentLevel} của vị trí ..., bạn hiện có thể đang ở ...").`;

  return `
Analyze the skill gap for a candidate targeting the role of "${input.targetRole}"
at the "${targetLevel}" level.
The candidate's CURRENT level is "${input.currentLevel}".

${skills}

Respond with this EXACT JSON structure (no markdown fences):
{
  "targetRole": "...",
  "currentLevel": "...",
  "gapSkills": [
    {
      "skill": "Skill name",
      "category": "technical | soft",
      "importance": "must-have | nice-to-have",
      "reason": "Why this gap matters for the target role",
      "suggestedResources": [
        {
          "type": "course | book | article | project | certification",
          "title": "Resource name",
          "url": "https://...",
          "duration": "e.g. 2 weeks"
        }
      ]
    }
  ],
  "matchedSkills": ["skill 1", "skill 2"],
  "overallGapScore": 0-100,
  "gapSummary": "1-2 sentence summary of the gap"
}
`.trim();
}

/**
 * Build the user prompt for full roadmap generation (skill gap + roadmap phases).
 * This is the main prompt used by POST /api/career/roadmap.
 */
export function buildRoadmapPrompt(input: CareerAnalyzeInput): string {
  const targetLevel = input.targetLevel ?? input.currentLevel;
  const skills = input.currentSkills
    ? `Current skills:\n  Technical: ${input.currentSkills.technical.join(", ") || "(none)"}\n  Soft: ${input.currentSkills.soft.join(", ") || "(none)"}`
    : input.cvText
    ? `CV text for you to extract current skills:\n"""\n${input.cvText}\n"""`
    : `No CV text or skill list provided.
The candidate has NOT listed their skills. INFER a realistic skill profile for
someone at the "${input.currentLevel}" level in "${input.targetRole}" and use it
as the baseline. Reflect that inference in "skillGap.gapSummary" so the user
knows the plan is based on an assumption rather than their own CV.`;

  return `
You are a career development advisor. For a candidate targeting "${input.targetRole}"
at the "${targetLevel}" level, produce a complete career roadmap.
The candidate's CURRENT level is "${input.currentLevel}".

${skills}

Respond ONLY with this JSON (no markdown fences):
{
  "targetRole": "...",
  "targetLevel": "...",
  "skillGap": {
    "targetRole": "...",
    "currentLevel": "...",
    "gapSkills": [...],
    "matchedSkills": [...],
    "overallGapScore": 0-100,
    "gapSummary": "..."
  },
  "roadmap": {
    "estimatedMonths": 6,
    "phases": [
      {
        "phase": "Phase 1: Foundation (Month 1-2)",
        "goals": ["Goal 1", "Goal 2"],
        "tasks": [
          {
            "title": "Task title",
            "description": "Optional description",
            "estimatedDays": 14,
            "resources": [
              { "type": "course | book | article | project | certification", "title": "...", "url": "https://...", "duration": "..." }
            ],
            "milestones": ["Milestone 1", "Milestone 2"]
          }
        ]
      }
    ],
    "totalEstimatedDays": 180
  },
  "careerAdvice": {
    "immediate": ["Action 1", "Action 2"],
    "shortTerm": ["Action 1", "Action 2"],
    "longTerm": ["Action 1", "Action 2"]
  }
}
`.trim();
}

export function normalizeRoadmapResponse(
  value: unknown,
  input: CareerAnalyzeInput,
  fallback?: { missingSkills?: unknown }
): unknown {
  if (typeof value !== "object" || value === null) return value;

  const response = value as Record<string, unknown>;
  const skillGap =
    typeof response.skillGap === "object" && response.skillGap !== null
      ? { ...(response.skillGap as Record<string, unknown>) }
      : {};

  const rawGapSkills =
    Array.isArray(skillGap.gapSkills) && skillGap.gapSkills.length > 0
      ? skillGap.gapSkills
      : Array.isArray(fallback?.missingSkills)
        ? fallback.missingSkills
        : [];
  const gapSkills = Array.isArray(rawGapSkills)
    ? rawGapSkills.map((item) =>
        typeof item === "string"
          ? {
              skill: item,
              category: "technical",
              importance: "must-have",
              suggestedResources: [],
            }
          : item
      )
    : [];
  const roadmap =
    typeof response.roadmap === "object" && response.roadmap !== null
      ? response.roadmap
      : {
      phases: Array.isArray(response.phases) ? response.phases : [],
      estimatedMonths: response.estimatedMonths,
      totalEstimatedDays: response.totalEstimatedDays,
    };

  return {
    ...response,
    roadmap,
    targetRole:
      typeof response.targetRole === "string"
        ? response.targetRole
        : input.targetRole,
    targetLevel:
      typeof response.targetLevel === "string"
        ? response.targetLevel
        : input.targetLevel ?? input.currentLevel,
    skillGap: {
      ...skillGap,
      targetRole:
        typeof skillGap.targetRole === "string"
          ? skillGap.targetRole
          : typeof response.targetRole === "string"
            ? response.targetRole
            : input.targetRole,
      currentLevel:
        typeof skillGap.currentLevel === "string"
          ? skillGap.currentLevel
          : typeof response.targetLevel === "string"
            ? response.targetLevel
            : input.currentLevel,
      gapSkills,
      matchedSkills: Array.isArray(skillGap.matchedSkills)
        ? skillGap.matchedSkills
        : [],
      overallGapScore:
        typeof skillGap.overallGapScore === "number"
          ? skillGap.overallGapScore
          : 0,
      gapSummary:
        typeof skillGap.gapSummary === "string"
          ? skillGap.gapSummary
          : "Lộ trình này chưa lưu phần tóm tắt skill gap.",
    },
  };
}

// ─── Core logic ────────────────────────────────────────────────────────────────

/**
 * Analyze skill gap only — lightweight, used by the analyze endpoint.
 * Returns a parsed SkillGap or throws AICareerError.
 */
export async function analyzeSkillGap(
  input: CareerAnalyzeInput
): Promise<SkillGap> {
  const parsed = CareerAnalyzeInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AICareerError(
      `Invalid input: ${parsed.error.message}`,
      "INVALID_RESPONSE_SCHEMA"
    );
  }

  const prompt = buildSkillGapPrompt(parsed.data);

  let raw: string;
  try {
    raw = await aiInternals.chatCompletion({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: prompt,
      temperature: 0.3,
      maxTokens: 2048,
    });
  } catch (err) {
    // A quota failure already carries its own code and reset time — it must
    // not be downgraded to a generic request failure.
    if (err instanceof AICareerError) throw err;
    if (err instanceof AIAnalysisError && err.code === "AI_QUOTA_EXCEEDED") {
      throw new AICareerError(err.message, "AI_QUOTA_EXCEEDED", err.resetsAt);
    }
    throw new AICareerError(
      `Skill gap analysis failed: ${(err as Error).message}`,
      "AI_REQUEST_FAILED"
    );
  }

  try {
    const parsed_1 = SkillGapSchema.safeParse(JSON.parse(stripJsonFence(raw)));
    if (!parsed_1.success) {
      console.error("[career/skill-gap] Schema errors:", parsed_1.error.flatten());
      console.error("[career/skill-gap] Raw response:", raw);
      throw new AICareerError(
        `AI response does not match SkillGap schema: ${parsed_1.error.message}`,
        "INVALID_RESPONSE_SCHEMA"
      );
    }
    return parsed_1.data;
  } catch (err) {
    if (err instanceof AICareerError) throw err;
    console.error("[career/skill-gap] Parse error:", err);
    throw new AICareerError(
      "Failed to parse AI skill gap response.",
      "INVALID_RESPONSE_SCHEMA"
    );
  }
}

/**
 * Generate full roadmap — skill gap + phased plan + career advice.
 * Used by POST /api/career/roadmap.
 * Returns a parsed CareerAnalyzeResult or throws AICareerError.
 */
export async function generateRoadmap(
  input: CareerAnalyzeInput
): Promise<CareerAnalyzeResult> {
  const parsed = CareerAnalyzeInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AICareerError(
      `Invalid input: ${parsed.error.message}`,
      "INVALID_RESPONSE_SCHEMA"
    );
  }

  const prompt = buildRoadmapPrompt(parsed.data);

  let raw: string;
  try {
    raw = await aiInternals.chatCompletion({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: prompt,
      temperature: 0.3,
      maxTokens: 4096,
    });
  } catch (err) {
    // A quota failure already carries its own code and reset time — it must
    // not be downgraded to a generic request failure.
    if (err instanceof AICareerError) throw err;
    if (err instanceof AIAnalysisError && err.code === "AI_QUOTA_EXCEEDED") {
      throw new AICareerError(err.message, "AI_QUOTA_EXCEEDED", err.resetsAt);
    }
    throw new AICareerError(
      `Roadmap generation failed: ${(err as Error).message}`,
      "AI_REQUEST_FAILED"
    );
  }

  try {
    const rawResponse = JSON.parse(stripJsonFence(raw));
    const parsed_2 = CareerAnalyzeResultSchema.safeParse(
      normalizeRoadmapResponse(rawResponse, parsed.data)
    );
    if (!parsed_2.success) {
      console.error("[career/roadmap] Schema errors:", parsed_2.error.flatten());
      console.error("[career/roadmap] Raw response:", raw);
      throw new AICareerError(
        `AI response does not match roadmap schema: ${parsed_2.error.message}`,
        "INVALID_RESPONSE_SCHEMA"
      );
    }
    return parsed_2.data;
  } catch (err) {
    if (err instanceof AICareerError) throw err;
    console.error("[career/roadmap] Parse error:", err);
    throw new AICareerError(
      "Failed to parse AI roadmap response.",
      "INVALID_RESPONSE_SCHEMA"
    );
  }
}

// ─── Re-export validators for convenience ───────────────────────────────────

export {
  CareerAnalyzeInputSchema,
  CareerAnalyzeResultSchema,
  SkillGapSchema,
} from "./validators";

export type {
  CareerAnalyzeInput,
  CareerAnalyzeResult,
  SkillGap,
  SkillGapItem,
  RoadmapPhase,
  RoadmapStepUpdate,
  RoadmapProgress,
} from "./validators";

// ─── Skill source ────────────────────────────────────────────────────────────
//
// The database-backed helpers live in `./skill-repository` and are NOT
// re-exported here: that module imports Prisma, and re-exporting it would
// pull Node-only modules into any browser bundle that imports this barrel.
//
// Server-side consumers import them directly:
//   import { resolveCvSkills } from "@/lib/career/skill-repository";

export { getSkillsFromAnalysisJson, normalizeSkillCategory } from "./skill-repository";

export type { CvSkillSource, SkillSets } from "./skill-repository";

// ─── Re-export progress helpers for convenience ──────────────────────────────

export {
  buildRoadmapProgress,
  cvSelectionHint,
  nextStepStatus,
  resolveSkillPayload,
  summarizeProgress,
  validateRoleInput,
  COMPLETED_STATUS,
} from "./progress";

export type { ProgressStep } from "./progress";
