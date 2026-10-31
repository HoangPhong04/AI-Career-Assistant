import { z } from "zod";
import { AIAnalysisError, aiInternals, stripJsonFence } from "@/lib/ai";

export const INTERVIEW_LEVELS = ["fresher", "junior", "mid", "senior"] as const;
export const INTERVIEW_TYPES = ["TECHNICAL", "BEHAVIORAL", "MIXED"] as const;

export const CreateInterviewSessionSchema = z.object({
  targetRole: z.string().trim().min(2).max(100),
  difficulty: z.enum(INTERVIEW_LEVELS),
  type: z.enum(INTERVIEW_TYPES),
  questionCount: z.number().int().min(3).max(10).default(5),
});

export const SubmitInterviewAnswerSchema = z.object({
  sessionId: z.uuid(),
  questionId: z.uuid(),
  answer: z.string().trim().min(1).max(10_000),
});

export const InterviewSessionIdSchema = z.uuid();

export const InterviewQuestionListSchema = z.object({
  questions: z
    .array(
      z.object({
        questionText: z.string().trim().min(10).max(1_000),
        questionType: z.enum(["TECHNICAL", "BEHAVIORAL"]),
      })
    )
    .min(3)
    .max(10),
});

export const InterviewAnswerEvaluationSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().trim().min(1).max(2_000),
  strengths: z.array(z.string().trim().min(1).max(300)).max(5),
  improvements: z.array(z.string().trim().min(1).max(300)).max(5),
});

export type CreateInterviewSessionInput = z.infer<
  typeof CreateInterviewSessionSchema
>;
export type InterviewQuestion = z.infer<
  typeof InterviewQuestionListSchema
>["questions"][number];
export type InterviewAnswerEvaluation = z.infer<
  typeof InterviewAnswerEvaluationSchema
>;

export function buildInterviewQuestionsPrompt(
  input: CreateInterviewSessionInput
): string {
  const questionTypes =
    input.type === "MIXED"
      ? "a balanced mix of technical and behavioral"
      : input.type === "TECHNICAL"
        ? "technical"
        : "behavioral";

  return `
Create exactly ${input.questionCount} distinct ${questionTypes} interview questions
for a ${input.difficulty}-level candidate applying for "${input.targetRole}".
Do not include answers, hints, numbering, or markdown.
Return only a JSON object matching this shape:
{
  "questions": [
    { "questionText": "A clear, role-specific question", "questionType": "TECHNICAL or BEHAVIORAL" }
  ]
}
`.trim();
}

export async function generateInterviewQuestions(
  input: CreateInterviewSessionInput
): Promise<InterviewQuestion[]> {
  const raw = await aiInternals.chatCompletion({
    systemPrompt:
      "You are an experienced interviewer. Return only valid JSON with concise, realistic interview questions.",
    userMessage: buildInterviewQuestionsPrompt(input),
    temperature: 0.5,
    maxTokens: 2048,
  });

  let response: unknown;
  try {
    response = JSON.parse(stripJsonFence(raw));
  } catch {
    throw new AIAnalysisError(
      "The AI returned invalid JSON for the interview questions.",
      "INVALID_RESPONSE_SCHEMA"
    );
  }

  const parsed = InterviewQuestionListSchema.safeParse(response);
  if (!parsed.success || parsed.data.questions.length !== input.questionCount) {
    throw new AIAnalysisError(
      "The AI response did not contain the requested number of valid interview questions.",
      "INVALID_RESPONSE_SCHEMA"
    );
  }

  return parsed.data.questions;
}

export async function evaluateInterviewAnswer(input: {
  targetRole: string;
  difficulty: string;
  question: string;
  answer: string;
}): Promise<InterviewAnswerEvaluation> {
  const raw = await aiInternals.chatCompletion({
    systemPrompt:
      "You are a fair interview coach. Evaluate only the candidate's answer against the question and role. Return only valid JSON.",
    userMessage: `
Evaluate this ${input.difficulty}-level interview answer for "${input.targetRole}".

Question: ${input.question}
Candidate answer: ${input.answer}

Return exactly this JSON shape:
{
  "score": 0,
  "feedback": "Short, actionable overall feedback",
  "strengths": ["Specific strength"],
  "improvements": ["Specific next step"]
}
Use a score from 0 to 100. Do not reward claims that are not supported by the answer.
`.trim(),
    temperature: 0.2,
    maxTokens: 1024,
  });

  let response: unknown;
  try {
    response = JSON.parse(stripJsonFence(raw));
  } catch {
    throw new AIAnalysisError(
      "The AI returned invalid JSON while evaluating the answer.",
      "INVALID_RESPONSE_SCHEMA"
    );
  }

  const parsed = InterviewAnswerEvaluationSchema.safeParse(response);
  if (!parsed.success) {
    throw new AIAnalysisError(
      "The AI response did not match the interview feedback format.",
      "INVALID_RESPONSE_SCHEMA"
    );
  }

  return parsed.data;
}

export function formatInterviewFeedback(
  evaluation: InterviewAnswerEvaluation
): string {
  return [
    evaluation.feedback,
    evaluation.strengths.length
      ? `Strengths: ${evaluation.strengths.join("; ")}`
      : "",
    evaluation.improvements.length
      ? `Areas to improve: ${evaluation.improvements.join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
