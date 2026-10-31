import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import {
  AIAnalysisError,
} from "@/lib/ai";
import {
  CreateInterviewSessionSchema,
  generateInterviewQuestions,
  InterviewSessionIdSchema,
} from "@/lib/interview";

const interviewSessionInclude = {
  questions: {
    orderBy: { orderIndex: "asc" as const },
    select: {
      id: true,
      orderIndex: true,
      questionText: true,
      questionType: true,
      userAnswer: true,
      aiFeedback: true,
      score: true,
    },
  },
};

function aiErrorResponse(error: AIAnalysisError) {
  const status = error.code === "API_KEY_MISSING" ? 503 : 502;
  return apiError(status, error.code, error.message);
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return apiError(401, "UNAUTHENTICATED", "Please sign in to continue");

  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (sessionId) {
    if (!InterviewSessionIdSchema.safeParse(sessionId).success)
      return apiError(400, "INVALID_SESSION_ID", "The sessionId must be a UUID.");

    const session = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId: user.id },
      include: interviewSessionInclude,
    });
    if (!session)
      return apiError(404, "SESSION_NOT_FOUND", "Interview session not found.");
    return NextResponse.json({ session });
  }

  const sessions = await prisma.interviewSession.findMany({
    where: { userId: user.id },
    include: interviewSessionInclude,
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return apiError(401, "UNAUTHENTICATED", "Please sign in to continue");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = CreateInterviewSessionSchema.safeParse(body);
  if (!parsed.success)
    return apiError(422, "VALIDATION_ERROR", parsed.error.message);

  try {
    const questions = await generateInterviewQuestions(parsed.data);
    const session = await prisma.interviewSession.create({
      data: {
        userId: user.id,
        position: parsed.data.targetRole,
        level: parsed.data.difficulty,
        type: parsed.data.type,
        status: "CREATED",
        questions: {
          create: questions.map((question, orderIndex) => ({
            orderIndex,
            questionText: question.questionText,
            questionType: question.questionType,
          })),
        },
      },
      include: interviewSessionInclude,
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    if (error instanceof AIAnalysisError) return aiErrorResponse(error);
    console.error("[interview/session] Failed to create interview session:", error);
    return apiError(
      500,
      "SESSION_CREATION_FAILED",
      "Unable to create the interview session."
    );
  }
}
