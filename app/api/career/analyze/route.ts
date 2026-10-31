/**
 * POST /api/career/analyze
 *
 * Analyze skill gap for a target role + current level.
 * Accepts either explicit skills (from CV Analyzer) or raw CV text.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import { analyzeSkillGap, CareerAnalyzeInputSchema } from "@/lib/career";

export async function POST(req: NextRequest) {
  // 1. Auth
  const user = await getCurrentUser();
  if (!user) return apiError(401, "UNAUTHORIZED", "Please sign in to continue.");

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

  const input = parsed.data;

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

  return NextResponse.json({ skillGap }, { status: 200 });
}
