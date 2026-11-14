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
  if (!user) return apiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để tiếp tục.");

  // 2. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Dữ liệu gửi lên phải là JSON hợp lệ.");
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
    return aiErrorResponse(err, "Phân tích khoảng cách kỹ năng thất bại.");
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
