import assert from "node:assert/strict";
import test from "node:test";
import { AIAnalysisError, aiInternals } from "@/lib/ai";
import {
  CreateInterviewSessionSchema,
  evaluateInterviewAnswer,
  generateInterviewQuestions,
  InterviewSessionIdSchema,
  INTERVIEW_TYPES,
  SubmitInterviewAnswerSchema,
} from "@/lib/interview";

let response = "";
let callCount = 0;

test.before(() => {
  test.mock.method(aiInternals, "chatCompletion", async () => {
    callCount += 1;
    return response;
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

test("question generation parses valid questions and uses requested settings", async () => {
  callCount = 0;
  response = JSON.stringify({
    questions: [
      { questionText: "How do you design a reliable API?", questionType: "TECHNICAL" },
      { questionText: "How do you resolve a disagreement with a teammate?", questionType: "BEHAVIORAL" },
      { questionText: "How do you improve database performance?", questionType: "TECHNICAL" },
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
    answer: "I use unit tests and check the API contract.",
  });

  assert.equal(evaluation.score, 82);
  assert.equal(evaluation.strengths.length, 1);
  assert.equal(evaluation.improvements.length, 1);
});
