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

export function calculateInterviewOverallScore(
  scores: Array<number | string | null>
): number | null {
  if (scores.length === 0 || scores.some((score) => score === null)) {
    return null;
  }

  const numericScores = scores.map(Number);
  if (numericScores.some((score) => !Number.isFinite(score))) {
    return null;
  }

  const average =
    numericScores.reduce((total, score) => total + score, 0) /
    numericScores.length;
  return Math.round(average * 100) / 100;
}

export function buildInterviewQuestionsPrompt(
  input: CreateInterviewSessionInput
): string {
  const questionTypes =
    input.type === "MIXED"
      ? "kết hợp cân bằng giữa câu hỏi kỹ thuật và tình huống hành vi"
      : input.type === "TECHNICAL"
        ? "kỹ thuật"
        : "tình huống hành vi";

  return `
Tạo đúng ${input.questionCount} câu hỏi phỏng vấn ${questionTypes} khác nhau
cho ứng viên cấp độ ${input.difficulty} ứng tuyển vị trí "${input.targetRole}".
Viết toàn bộ nội dung câu hỏi bằng tiếng Việt tự nhiên, bất kể tên vị trí hoặc
thuật ngữ đầu vào dùng ngôn ngữ nào. Không viết câu hỏi bằng tiếng Anh; giữ
nguyên tên công nghệ và thuật ngữ chuyên ngành phổ biến khi phù hợp.
Không đưa câu trả lời, gợi ý, số thứ tự hoặc định dạng Markdown.
Chỉ trả về một đối tượng JSON theo cấu trúc sau:
{
  "questions": [
    { "questionText": "Bạn sẽ thiết kế một API đáng tin cậy như thế nào?", "questionType": "TECHNICAL or BEHAVIORAL" }
  ]
}
`.trim();
}

export function buildInterviewAnswerPrompt(input: {
  targetRole: string;
  difficulty: string;
  question: string;
  questionType: string;
  answer: string;
}): string {
  return `
Đánh giá câu trả lời phỏng vấn cho vị trí "${input.targetRole}" ở cấp độ ${input.difficulty}.
Dựa trên yêu cầu chuyên môn của vị trí, loại câu hỏi (${input.questionType}),
câu hỏi được đưa ra và câu trả lời thực tế của ứng viên. Viết toàn bộ nhận xét
bằng tiếng Việt tự nhiên. Không suy diễn hoặc ghi nhận thành tích không có trong câu trả lời.

Câu hỏi: ${input.question}
Câu trả lời của ứng viên: ${input.answer}

Chỉ trả về đúng cấu trúc JSON sau:
{
  "score": 0,
  "feedback": "Nhận xét tổng quan ngắn gọn, có thể áp dụng",
  "strengths": ["Điểm mạnh cụ thể"],
  "improvements": ["Bước cải thiện tiếp theo"]
}
Chấm điểm từ 0 đến 100.
`.trim();
}

export async function generateInterviewQuestions(
  input: CreateInterviewSessionInput
): Promise<InterviewQuestion[]> {
  const raw = await aiInternals.chatCompletion({
    systemPrompt:
      "Bạn là chuyên gia phỏng vấn giàu kinh nghiệm. Hãy viết mọi câu hỏi bằng tiếng Việt tự nhiên và chỉ trả về JSON hợp lệ với các câu hỏi ngắn gọn, thực tế.",
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
  questionType: string;
  answer: string;
}): Promise<InterviewAnswerEvaluation> {
  const userMessage = buildInterviewAnswerPrompt(input);
  const responseFormatError =
    "AI trả về kết quả đánh giá không đúng định dạng. Vui lòng thử lại.";
  const parseEvaluation = (raw: string): InterviewAnswerEvaluation | null => {
    try {
      const parsed = InterviewAnswerEvaluationSchema.safeParse(
        JSON.parse(stripJsonFence(raw))
      );
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  };

  const systemPrompt =
    "Bạn là chuyên gia huấn luyện phỏng vấn công bằng. Đánh giá câu trả lời dựa trên vị trí, cấp độ và nội dung câu hỏi; chỉ trả về JSON hợp lệ bằng tiếng Việt.";
  const raw = await aiInternals.chatCompletion({
    systemPrompt,
    userMessage,
    temperature: 0.2,
    maxTokens: 2048,
  });
  const evaluation = parseEvaluation(raw);
  if (evaluation) return evaluation;

  const retriedRaw = await aiInternals.chatCompletion({
    systemPrompt: `${systemPrompt} Đầu ra phải là một đối tượng JSON hợp lệ, không có văn bản hoặc Markdown bên ngoài JSON.`,
    userMessage: `${userMessage}\n\nHãy kiểm tra kỹ cú pháp JSON và bảo đảm mọi chuỗi được escape hợp lệ.`,
    temperature: 0,
    maxTokens: 2048,
  });
  const retriedEvaluation = parseEvaluation(retriedRaw);
  if (retriedEvaluation) return retriedEvaluation;

  throw new AIAnalysisError(
    responseFormatError,
    "INVALID_RESPONSE_SCHEMA"
  );
}

export function formatInterviewFeedback(
  evaluation: InterviewAnswerEvaluation
): string {
  return [
    evaluation.feedback,
    evaluation.strengths.length
      ? `Điểm mạnh: ${evaluation.strengths.join("; ")}`
      : "",
    evaluation.improvements.length
      ? `Cần cải thiện: ${evaluation.improvements.join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
