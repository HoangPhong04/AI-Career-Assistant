import assert from "node:assert/strict";
import test from "node:test";
import {
  AIAnalysisError,
  aiInternals,
  normalizeAIRequestError,
} from "@/lib/ai";
import {
  buildInterviewAnswerPrompt,
  buildInterviewQuestionsPrompt,
  calculateInterviewOverallScore,
  CreateInterviewSessionSchema,
  evaluateInterviewAnswer,
  formatInterviewFeedback,
  generateInterviewQuestions,
  InterviewSessionIdSchema,
  INTERVIEW_TYPES,
  SubmitInterviewAnswerSchema,
} from "@/lib/interview";

let response = "";
let queuedResponses: string[] = [];
let callCount = 0;

test("AI quota errors are normalized without exposing provider response details", () => {
  const error = normalizeAIRequestError({
    status: 429,
    message:
      '{"error":{"status":"RESOURCE_EXHAUSTED","message":"quota exceeded: private provider details"}}',
  });

  assert.equal(error.code, "RATE_LIMITED");
  assert.match(error.message, /Hạn mức sử dụng Gemini/);
  assert.doesNotMatch(error.message, /private provider details|RESOURCE_EXHAUSTED/);
});

test("temporary Gemini unavailability is normalized to a Vietnamese retry message", () => {
  const error = normalizeAIRequestError({
    status: 503,
    message:
      '{"error":{"status":"UNAVAILABLE","message":"This model is currently experiencing high demand."}}',
  });

  assert.equal(error.code, "AI_UNAVAILABLE");
  assert.match(error.message, /đang quá tải hoặc tạm thời không khả dụng/i);
  assert.doesNotMatch(error.message, /high demand|UNAVAILABLE/);
});

test.before(() => {
  test.mock.method(aiInternals, "chatCompletion", async () => {
    callCount += 1;
    return queuedResponses.shift() ?? response;
  });
});

test("session validation trims role and defaults to five questions", () => {
  const input = CreateInterviewSessionSchema.parse({
    targetRole: "  Backend Developer  ",
    difficulty: "junior",
    type: "MIXED",
  });

  assert.equal(input.targetRole, "Backend Developer");
  assert.equal(input.questionCount, 5);
  assert.deepEqual(INTERVIEW_TYPES, ["TECHNICAL", "BEHAVIORAL", "MIXED"]);
});

test("answer validation rejects empty answers and malformed IDs", () => {
  assert.equal(InterviewSessionIdSchema.safeParse("not-a-uuid").success, false);
  assert.equal(
    SubmitInterviewAnswerSchema.safeParse({
      sessionId: "not-a-uuid",
      questionId: "not-a-uuid",
      answer: "",
    }).success,
    false
  );
});

test("question generation prompt requires Vietnamese regardless of the role language", () => {
  const prompt = buildInterviewQuestionsPrompt({
    targetRole: "Backend Developer",
    difficulty: "mid",
    type: "MIXED",
    questionCount: 3,
  });

  assert.match(prompt, /bằng tiếng Việt tự nhiên/i);
  assert.match(prompt, /Không viết câu hỏi bằng tiếng Anh/i);
  assert.match(prompt, /Bạn sẽ thiết kế một API đáng tin cậy như thế nào\?/);
});

test("interview answer prompt evaluates role-specific context in Vietnamese", () => {
  const prompt = buildInterviewAnswerPrompt({
    targetRole: "Backend Developer",
    difficulty: "mid",
    question: "Bạn xử lý giao dịch cơ sở dữ liệu như thế nào?",
    questionType: "TECHNICAL",
    answer: "Tôi dùng transaction để đảm bảo tính nhất quán.",
  });

  assert.match(prompt, /Backend Developer/);
  assert.match(prompt, /mid/);
  assert.match(prompt, /Bạn xử lý giao dịch cơ sở dữ liệu như thế nào\?/);
  assert.match(prompt, /Tôi dùng transaction để đảm bảo tính nhất quán/);
  assert.match(prompt, /bằng tiếng Việt tự nhiên/);
});

test("overall interview score requires every answer to be evaluated and rounds to two decimals", () => {
  assert.equal(calculateInterviewOverallScore([80, "91", 89]), 86.67);
  assert.equal(calculateInterviewOverallScore([80, null]), null);
  assert.equal(calculateInterviewOverallScore([]), null);
});

test("question generation parses valid questions and uses requested settings", async () => {
  callCount = 0;
  response = JSON.stringify({
    questions: [
      { questionText: "Bạn thiết kế một API đáng tin cậy như thế nào?", questionType: "TECHNICAL" },
      { questionText: "Bạn giải quyết bất đồng với đồng đội như thế nào?", questionType: "BEHAVIORAL" },
      { questionText: "Bạn cải thiện hiệu năng cơ sở dữ liệu như thế nào?", questionType: "TECHNICAL" },
    ],
  });

  const questions = await generateInterviewQuestions({
    targetRole: "Backend Developer",
    difficulty: "mid",
    type: "MIXED",
    questionCount: 3,
  });

  assert.equal(callCount, 1);
  assert.equal(questions.length, 3);
  assert.equal(questions[1]?.questionType, "BEHAVIORAL");
});

test("question generation rejects a response with the wrong question count", async () => {
  response = JSON.stringify({
    questions: [
      { questionText: "Describe an API you have designed.", questionType: "TECHNICAL" },
      { questionText: "How do you handle a challenging deadline?", questionType: "BEHAVIORAL" },
      { questionText: "How would you troubleshoot a slow service?", questionType: "TECHNICAL" },
    ],
  });

  await assert.rejects(
    () =>
      generateInterviewQuestions({
        targetRole: "Backend Developer",
        difficulty: "mid",
        type: "MIXED",
        questionCount: 5,
      }),
    (error: unknown) =>
      error instanceof AIAnalysisError &&
      error.code === "INVALID_RESPONSE_SCHEMA"
  );
});

test("answer evaluation validates feedback and score", async () => {
  queuedResponses = [];
  response = JSON.stringify({
    score: 82,
    feedback: "The answer explains the trade-off clearly.",
    strengths: ["Provides a concrete example."],
    improvements: ["Describe how the result was measured."],
  });

  const evaluation = await evaluateInterviewAnswer({
    targetRole: "Backend Developer",
    difficulty: "junior",
    question: "How do you test an API?",
    questionType: "TECHNICAL",
    answer: "I use unit tests and check the API contract.",
  });

  assert.equal(evaluation.score, 82);
  assert.equal(evaluation.strengths.length, 1);
  assert.equal(evaluation.improvements.length, 1);
  assert.match(formatInterviewFeedback(evaluation), /Điểm mạnh/);
  assert.match(formatInterviewFeedback(evaluation), /Cần cải thiện/);
});

test("answer evaluation retries once when the AI response is invalid JSON", async () => {
  callCount = 0;
  queuedResponses = [
    "Đây là kết quả đánh giá:",
    JSON.stringify({
      score: 82,
      feedback: "Câu trả lời có giải thích rõ ràng.",
      strengths: ["Có ví dụ cụ thể."],
      improvements: ["Nêu cách đo kết quả."],
    }),
  ];

  const evaluation = await evaluateInterviewAnswer({
    targetRole: "Backend Developer",
    difficulty: "junior",
    question: "Bạn kiểm thử API như thế nào?",
    questionType: "TECHNICAL",
    answer: "Tôi viết kiểm thử đơn vị và kiểm tra hợp đồng API.",
  });

  assert.equal(callCount, 2);
  assert.equal(evaluation.score, 82);
});

test("answer evaluation returns a clear error when its retry is still invalid", async () => {
  callCount = 0;
  queuedResponses = ["not JSON", "still not JSON"];

  await assert.rejects(
    () =>
      evaluateInterviewAnswer({
        targetRole: "Backend Developer",
        difficulty: "junior",
        question: "Bạn kiểm thử API như thế nào?",
        questionType: "TECHNICAL",
        answer: "Tôi viết kiểm thử đơn vị.",
      }),
    (error: unknown) =>
      error instanceof AIAnalysisError &&
      error.code === "INVALID_RESPONSE_SCHEMA" &&
      error.message.includes("định dạng")
  );

  assert.equal(callCount, 2);
  queuedResponses = [];
});
