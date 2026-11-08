/**
 * POST /api/career/analyze
 *
 * Analyze skill gap for a target role + current level.
 * Accepts either explicit skills (from CV Analyzer) or raw CV text.
 */
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { analyzeSkillGap, CareerAnalyzeInputSchema } from "@/lib/career";
import type { z } from "zod";

async function applyAnalyzedCV(userId: string, input: z.infer<typeof CareerAnalyzeInputSchema>) {
  const cv = await prisma.cV.findFirst({
    where: {
      userId,
      status: "ANALYZED",
      ...(input.cvId ? { id: input.cvId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, extractedText: true, analysisJson: true },
  });
  if (!cv) return { input, cvId: input.cvId };

  const analysis = cv.analysisJson as {
    skills?: { technical?: string[]; soft?: string[] };
  } | null;
  const technical = analysis?.skills?.technical ?? [];
  const soft = analysis?.skills?.soft ?? [];
  return {
    cvId: cv.id,
    input: {
      ...input,
      currentSkills: input.currentSkills ?? { technical, soft },
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
    const code =
      err instanceof Error ? (err as { code?: string }).code ?? "AI_ERROR" : "AI_ERROR";
    return apiError(500, code, (err as Error).message ?? "Skill gap analysis failed.");
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
