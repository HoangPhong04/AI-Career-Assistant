/**
 * POST /api/career/roadmap
 *
 * Generate a full career roadmap: skill gap + phased plan + career advice.
 * Saves the result to the database.
 *
 * Query params (optional):
 *   cvId=<uuid>   — link the roadmap to a specific analyzed CV
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import {
  generateRoadmap,
  CareerAnalyzeInputSchema,
} from "@/lib/career";
import { RoadmapStepUpdateSchema } from "@/lib/career/validators";

// ─── POST — Generate and save roadmap ──────────────────────────────────────────

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
  const { searchParams } = new URL(req.url);
  const cvId = searchParams.get("cvId") ?? undefined;

  // 3. Validate cvId if provided
  if (cvId) {
    const cv = await prisma.cV.findFirst({
      where: { id: cvId, userId: user.id },
      select: { id: true },
    });
    if (!cv) {
      return apiError(404, "CV_NOT_FOUND", "CV not found or does not belong to you.");
    }
  }

  // 4. Generate roadmap via AI
  let result;
  try {
    result = await generateRoadmap(input);
  } catch (err: unknown) {
    const code =
      err instanceof Error ? (err as { code?: string }).code ?? "AI_ERROR" : "AI_ERROR";
    return apiError(500, code, (err as Error).message ?? "Roadmap generation failed.");
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
        targetLevel: input.currentLevel,
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
    return apiError(500, "DB_ERROR", "Failed to save roadmap to database.");
  }

  return NextResponse.json(
    { roadmapId, stepIds, ...result },
    { status: 201 }
  );
}

// ─── GET — List roadmaps or get one ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "UNAUTHORIZED", "Please sign in to continue.");

  const { searchParams } = new URL(req.url);
  const roadmapId = searchParams.get("id");

  if (roadmapId) {
    // Fetch single roadmap (must belong to current user)
    const roadmap = await prisma.careerRoadmap.findFirst({
      where: { id: roadmapId, userId: user.id },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });

    if (!roadmap) {
      return apiError(404, "NOT_FOUND", "Roadmap not found.");
    }

    return NextResponse.json({ roadmap }, { status: 200 });
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

  return NextResponse.json({ roadmaps }, { status: 200 });
}

// ─── PATCH — Update roadmap step progress ────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "UNAUTHORIZED", "Please sign in to continue.");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
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

  if (!step || step.roadmap.userId !== user.id) {
    return apiError(404, "NOT_FOUND", "Step not found.");
  }

  const updated = await prisma.roadmapStep.update({
    where: { id: stepId },
    data: { status, description: notes ?? step.description },
  });

  return NextResponse.json({ step: updated }, { status: 200 });
}
