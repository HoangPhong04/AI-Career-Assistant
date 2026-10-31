import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import {
  InterviewSessionIdSchema,
  SubmitInterviewAnswerSchema,
} from "@/lib/interview";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return apiError(401, "UNAUTHENTICATED", "Please sign in to continue");

  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId)
    return apiError(400, "SESSION_ID_REQUIRED", "A sessionId is required.");
  if (!InterviewSessionIdSchema.safeParse(sessionId).success)
    return apiError(400, "INVALID_SESSION_ID", "The sessionId must be a UUID.");

  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId: user.id },
    include: {
      questions: {
        orderBy: { orderIndex: "asc" },
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
    },
  });
  if (!session)
    return apiError(404, "SESSION_NOT_FOUND", "Interview session not found.");

  return NextResponse.json({ session });
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

  const parsed = SubmitInterviewAnswerSchema.safeParse(body);
  if (!parsed.success)
    return apiError(422, "VALIDATION_ERROR", parsed.error.message);

  try {
    const updated = await prisma.$transaction(
      async (transaction) => {
        const session = await transaction.interviewSession.findFirst({
          where: { id: parsed.data.sessionId, userId: user.id },
          include: {
            questions: {
              orderBy: { orderIndex: "asc" },
              select: { id: true, userAnswer: true },
            },
          },
        });
        if (!session) return { error: "SESSION_NOT_FOUND" as const };
        if (session.status === "COMPLETED")
          return { error: "SESSION_COMPLETED" as const };

        const nextQuestion = session.questions.find(
          (question) => question.userAnswer === null
        );
        if (!nextQuestion || nextQuestion.id !== parsed.data.questionId)
          return { error: "QUESTION_OUT_OF_ORDER" as const };

        const saved = await transaction.interviewQuestion.updateMany({
          where: {
            id: parsed.data.questionId,
            sessionId: session.id,
            userAnswer: null,
          },
          data: { userAnswer: parsed.data.answer },
        });
        if (saved.count !== 1) return { error: "ANSWER_ALREADY_SUBMITTED" as const };

        const isComplete =
          session.questions.filter((question) => question.userAnswer === null)
            .length === 1;
        const updatedSession = await transaction.interviewSession.update({
          where: { id: session.id },
          data: {
            status: isComplete ? "COMPLETED" : "IN_PROGRESS",
            startedAt: session.startedAt ?? new Date(),
            endedAt: isComplete ? new Date() : null,
          },
          include: {
            questions: {
              orderBy: { orderIndex: "asc" },
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
          },
        });
        return { session: updatedSession };
      },
      { isolationLevel: "Serializable" }
    );

    if ("error" in updated) {
      if (updated.error === "SESSION_NOT_FOUND")
        return apiError(404, "SESSION_NOT_FOUND", "Interview session not found.");
      if (updated.error === "SESSION_COMPLETED")
        return apiError(409, "SESSION_COMPLETED", "This interview is already complete.");
      if (updated.error === "QUESTION_OUT_OF_ORDER")
        return apiError(409, "QUESTION_OUT_OF_ORDER", "Answer the current question before moving on.");
      return apiError(409, "ANSWER_ALREADY_SUBMITTED", "This answer has already been submitted.");
    }

    return NextResponse.json({ session: updated.session });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2034"
    ) {
      return apiError(
        409,
        "SESSION_UPDATED",
        "The interview changed while saving. Reload it and try again."
      );
    }
    console.error("[interview/question] Failed to save interview answer:", error);
    return apiError(500, "ANSWER_SUBMISSION_FAILED", "Unable to save this answer.");
  }
}
