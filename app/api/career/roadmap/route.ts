/**
 * POST /api/career/roadmap
 *
 * Generate a full career roadmap: skill gap + phased plan + career advice.
 * Saves the result to the database.
 *
 * Query params (optional):
 *   cvId=<uuid>   — link the roadmap to a specific analyzed CV
 */
import { Prisma } from "@/app/generated/prisma";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, aiErrorResponse } from "@/lib/utils";
import {
  generateRoadmap,
  CareerAnalyzeInputSchema,
} from "@/lib/career";
import { resolveCvSkills } from "@/lib/career/skill-repository";
import { RoadmapStepUpdateSchema } from "@/lib/career/validators";
import { NextRequest } from "next/server";
import type { CareerAnalyzeInput } from "@/lib/career";
import { belongsToUser } from "@/lib/access-control";

// ─── POST — Generate and save roadmap ──────────────────────────────────────────

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

  const requestedCvId = parsed.data.cvId;
  let input: CareerAnalyzeInput = parsed.data;
  let cvId = requestedCvId;

  // A CV is only attached when the user explicitly picked one. Without a
  // `cvId` the current skills come from the user's own input — we never
  // silently fall back to the most recent CV, otherwise the roadmap would
  // describe skills the user did not choose.
  const cv = requestedCvId
    ? await prisma.cV.findFirst({
        where: { id: requestedCvId, userId: user.id, status: "ANALYZED" },
        select: { id: true, extractedText: true, analysisJson: true },
      })
    : null;
  if (requestedCvId && !cv)
    return apiError(404, "CV_NOT_FOUND", "Không tìm thấy CV đã phân tích hoặc CV không thuộc về bạn.");
  if (cv) {
    cvId = cv.id;
    // Skills come from the normalized skill tables, with a legacy JSON fallback.
    const resolved = await resolveCvSkills(cv);
    input = {
      ...input,
      currentSkills: input.currentSkills ?? resolved.skills,
      cvText: input.cvText ?? cv.extractedText ?? undefined,
    };
  }

  // 4. Generate roadmap via AI
  let result;
  try {
    result = await generateRoadmap(input);
  } catch (err: unknown) {
    return aiErrorResponse(err, "Tạo lộ trình nghề nghiệp thất bại.");
  }

  // 5. Save to database
  let roadmapId: string;
  let stepIds: string[] = [];
  try {
    const flatTasks = result.roadmap.phases.flatMap((phase) => phase.tasks);

    const roadmap = await prisma.careerRoadmap.create({
      data: {
        userId: user.id,
        cvId: cvId ?? null,
        targetRole: input.targetRole,
        targetLevel: input.targetLevel ?? input.currentLevel,
        currentSkills: (input.currentSkills ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        missingSkills: result.skillGap.gapSkills.map((s) => s.skill) ?? Prisma.JsonNull,
        roadmapJson: result.roadmap as unknown as Prisma.InputJsonValue,
        status: "ACTIVE",
        steps: {
          create: result.roadmap.phases.flatMap((phase, phaseIdx) =>
            phase.tasks.map((task, taskIdx) => ({
              title: task.title,
              description: task.description ?? null,
              orderIndex: phaseIdx * 100 + taskIdx,
              resources: { phase: phase.phase, ...task.resources } as unknown as Prisma.InputJsonValue,
              status: "PENDING",
            }))
          ),
        },
      },
      select: { id: true, steps: { select: { id: true }, orderBy: { orderIndex: "asc" } } },
    });

    roadmapId = roadmap.id;
    stepIds = flatTasks.map((_, idx) => roadmap.steps[idx]?.id).filter((id): id is string => Boolean(id));
  } catch (dbErr) {
    console.error("[career/roadmap] Database save failed:", dbErr);
    return apiError(500, "DB_ERROR", "Không thể lưu lộ trình vào cơ sở dữ liệu.");
  }

  return apiSuccess(
    { roadmapId, stepIds, ...result },
    201
  );
}

// ─── GET — List roadmaps or get one ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để tiếp tục.");

  const { searchParams } = new URL(req.url);
  const roadmapId = searchParams.get("id");

  if (roadmapId) {
    // Fetch single roadmap (must belong to current user)
    const roadmap = await prisma.careerRoadmap.findFirst({
      where: { id: roadmapId, userId: user.id },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });

    if (!roadmap) {
      return apiError(404, "NOT_FOUND", "Không tìm thấy lộ trình.");
    }

    return apiSuccess({ roadmap });
  }

  // List all roadmaps for the current user
  const roadmaps = await prisma.careerRoadmap.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      targetRole: true,
      targetLevel: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return apiSuccess({ roadmaps });
}

// ─── PATCH — Update roadmap step progress ────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để tiếp tục.");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Dữ liệu gửi lên phải là JSON hợp lệ.");
  }

  const parsed = RoadmapStepUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, "VALIDATION_ERROR", parsed.error.message);
  }

  const { stepId, status, notes } = parsed.data;

  // Verify ownership via roadmap → user
  const step = await prisma.roadmapStep.findFirst({
    where: { id: stepId },
    include: { roadmap: { select: { userId: true } } },
  });

  if (!step || !belongsToUser(step.roadmap, user.id)) {
    return apiError(404, "NOT_FOUND", "Không tìm thấy nhiệm vụ.");
  }

  const updated = await prisma.roadmapStep.update({
    where: { id: stepId },
    data: { status, description: notes ?? step.description },
  });

  return apiSuccess({ step: updated });
}
