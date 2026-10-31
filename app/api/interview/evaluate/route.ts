import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import { AIAnalysisError } from "@/lib/ai";
import {
  evaluateInterviewAnswer,
  formatInterviewFeedback,
  SubmitInterviewAnswerSchema,
} from "@/lib/interview";

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

  const parsed = SubmitInterviewAnswerSchema.pick({
    sessionId: true,
    questionId: true,
  }).safeParse(body);
  if (!parsed.success)
    return apiError(422, "VALIDATION_ERROR", parsed.error.message);

  const question = await prisma.interviewQuestion.findFirst({
    where: {
      id: parsed.data.questionId,
      sessionId: parsed.data.sessionId,
      session: { userId: user.id },
    },
    select: {
      questionText: true,
      userAnswer: true,
      aiFeedback: true,
      score: true,
      session: { select: { position: true, level: true } },
    },
  });
  if (!question)
    return apiError(404, "QUESTION_NOT_FOUND", "Interview question not found.");
  if (!question.userAnswer)
    return apiError(409, "ANSWER_REQUIRED", "Submit an answer before requesting feedback.");
  if (question.aiFeedback !== null && question.score !== null) {
    return NextResponse.json({
      evaluation: {
        feedback: question.aiFeedback,
        score: question.score,
      },
    });
  }

  try {
    const evaluation = await evaluateInterviewAnswer({
      targetRole: question.session.position,
      difficulty: question.session.level ?? "junior",
      question: question.questionText,
      answer: question.userAnswer,
    });
    const result = await prisma.interviewQuestion.updateMany({
      where: {
        id: parsed.data.questionId,
        sessionId: parsed.data.sessionId,
        session: { userId: user.id },
        userAnswer: question.userAnswer,
      },
      data: {
        score: evaluation.score,
        aiFeedback: formatInterviewFeedback(evaluation),
      },
    });
    if (result.count !== 1)
      return apiError(409, "ANSWER_CHANGED", "The answer changed; reload and try again.");

    return NextResponse.json({ evaluation });
  } catch (error) {
    if (error instanceof AIAnalysisError) {
      const status = error.code === "API_KEY_MISSING" ? 503 : 502;
      return apiError(status, error.code, error.message);
    }
    console.error("[interview/evaluate] Failed to evaluate interview answer:", error);
    return apiError(502, "EVALUATION_FAILED", "Unable to evaluate this answer.");
  }
}
