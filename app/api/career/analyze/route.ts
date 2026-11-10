/**
 * POST /api/career/analyze
 *
 * Analyze skill gap for a target role + current level.
 * Accepts either explicit skills (from CV Analyzer) or raw CV text.
 */
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, aiErrorResponse } from "@/lib/utils";
import { analyzeSkillGap, CareerAnalyzeInputSchema } from "@/lib/career";
import { resolveCvSkills } from "@/lib/career/skill-repository";
import type { z } from "zod";

/**
 * Attach the skills of an analysed CV to the request payload.
 *
 * Skills come from the normalised `skill` ⨝ `cv_skill` tables written by the
 * CV Analyzer. Older CVs that predate the skill table fall back to the raw
 * `analysisJson` payload.
 *
 * When no `cvId` is supplied the request carries no skills at all — the AI
 * then infers a realistic skill profile from the candidate's current level
 * and target role. We never silently fall back to the most recent CV,
 * otherwise the analysis would describe skills the user did not pick.
 */
async function applyAnalyzedCV(userId: string, input: z.infer<typeof CareerAnalyzeInputSchema>) {
  if (!input.cvId) {
    return { input, cvId: undefined };
  }

  const cv = await prisma.cV.findFirst({
    where: {
      id: input.cvId,
      userId,
      status: "ANALYZED",
    },
    select: { id: true, extractedText: true, analysisJson: true },
  });
  if (!cv) return { input, cvId: undefined };

  const resolved = await resolveCvSkills(cv);
  return {
    cvId: cv.id,
    input: {
      ...input,
      currentSkills: input.currentSkills ?? resolved.skills,
      cvText: input.cvText ?? cv.extractedText ?? undefined,
    },
  };
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const user = await getCurrentUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "Please sign in to continue.");

  // 2. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = CareerAnalyzeInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, "VALIDATION_ERROR", parsed.error.message);
  }

  const resolved = await applyAnalyzedCV(user.id, parsed.data);
  const input = resolved.input;

  // 3. Analyze skill gap
  let skillGap;
  try {
    skillGap = await analyzeSkillGap(input);
  } catch (err: unknown) {
    return aiErrorResponse(err, "Skill gap analysis failed.");
  }

  // 4. Save career goal for reference (optional — do not block on DB error)
  try {
    await prisma.careerGoal.create({
      data: {
        userId: user.id,
        title: `${input.targetRole} @ ${input.currentLevel}`,
        targetRole: input.targetRole,
        targetLevel: input.currentLevel,
      },
    });
  } catch (dbErr) {
    console.warn("[career/analyze] Failed to save CareerGoal:", dbErr);
    // Non-fatal — return analysis result even if goal save fails
  }

  return apiSuccess({ skillGap, cvId: resolved.cvId });
}
