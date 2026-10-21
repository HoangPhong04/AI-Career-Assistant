/**
 * Career Roadmap — skill gap analysis & roadmap generation.
 *
 * Entry points for other modules:
 *  - `analyzeSkillGap(input)`          → SkillGap
 *  - `generateRoadmap(input)`          → CareerAnalyzeResult
 *  - `buildAnalyzePrompt(input)`       → raw AI prompt (for route handlers)
 */

import {
  CareerAnalyzeInputSchema,
  CareerAnalyzeResultSchema,
  SkillGapSchema,
  type CareerAnalyzeInput,
  type CareerAnalyzeResult,
  type SkillGap,
} from "./validators";

import { aiInternals, stripJsonFence, AICareerError } from "@/lib/ai";

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
  const skills = input.currentSkills
    ? `Current skills:\n  Technical: ${input.currentSkills.technical.join(", ") || "(none)"}\n  Soft: ${input.currentSkills.soft.join(", ") || "(none)"}`
    : input.cvText
    ? `CV text for you to extract current skills:\n"""\n${input.cvText}\n"""`
    : "No CV text or skill list provided — infer the current level from the target role.";

  return `
Analyze the skill gap for a candidate targeting the role of "${input.targetRole}"
at the "${input.currentLevel}" level.

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
  const skills = input.currentSkills
    ? `Current skills:\n  Technical: ${input.currentSkills.technical.join(", ") || "(none)"}\n  Soft: ${input.currentSkills.soft.join(", ") || "(none)"}`
    : input.cvText
    ? `CV text for you to extract current skills:\n"""\n${input.cvText}\n"""`
    : "No CV text or skill list provided.";

  return `
You are a career development advisor. For a candidate targeting "${input.targetRole}"
at the "${input.currentLevel}" level, produce a complete career roadmap.

${skills}

Respond ONLY with this JSON (no markdown fences):
{
  "targetRole": "...",
  "targetLevel": "...",
  "skillGap": {
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
    if (err instanceof AICareerError) throw err;
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
    if (err instanceof AICareerError) throw err;
    throw new AICareerError(
      `Roadmap generation failed: ${(err as Error).message}`,
      "AI_REQUEST_FAILED"
    );
  }

  try {
    const parsed_2 = CareerAnalyzeResultSchema.safeParse(
      JSON.parse(stripJsonFence(raw))
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
