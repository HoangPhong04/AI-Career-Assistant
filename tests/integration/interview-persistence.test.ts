import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import { prisma } from "@/lib/prisma";
import {
  calculateInterviewOverallScore,
  getInterviewAnswerTransition,
} from "@/lib/interview";

after(async () => {
  await prisma.$disconnect();
});

test("interview answers, ordered questions, and the completed report persist consistently", async () => {
  const email = `interview-${randomUUID()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email,
      fullName: "Interview Integration Test",
      passwordHash: "not-a-real-hash-for-integration-tests",
    },
    select: { id: true },
  });

  try {
    const created = await prisma.interviewSession.create({
      data: {
        userId: user.id,
        position: "Integration Test Role",
        level: "junior",
        type: "MIXED",
        status: "CREATED",
        questions: {
          create: [
            {
              orderIndex: 2,
              questionText: "Câu hỏi thứ ba trong buổi phỏng vấn là gì?",
              questionType: "BEHAVIORAL",
            },
            {
              orderIndex: 0,
              questionText: "Câu hỏi đầu tiên trong buổi phỏng vấn là gì?",
              questionType: "TECHNICAL",
            },
            {
              orderIndex: 1,
              questionText: "Câu hỏi thứ hai trong buổi phỏng vấn là gì?",
              questionType: "TECHNICAL",
            },
          ],
        },
      },
      include: { questions: true },
    });

    let session = await prisma.interviewSession.findFirstOrThrow({
      where: { id: created.id, userId: user.id },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    });
    assert.deepEqual(
      session.questions.map((question) => question.orderIndex),
      [0, 1, 2]
    );

    assert.deepEqual(
      getInterviewAnswerTransition(
        session.status,
        session.questions,
        session.questions[1]!.id
      ),
      { error: "QUESTION_OUT_OF_ORDER" }
    );

    for (const [index, question] of session.questions.entries()) {
      const transition = getInterviewAnswerTransition(
        session.status,
        session.questions,
        question.id
      );
      assert.ok(!("error" in transition));

      await prisma.$transaction(async (transaction) => {
        const saved = await transaction.interviewQuestion.updateMany({
          where: {
            id: question.id,
            sessionId: session.id,
            userAnswer: null,
          },
          data: { userAnswer: `Answer ${index + 1}` },
        });
        assert.equal(saved.count, 1);
        await transaction.interviewSession.update({
          where: { id: session.id },
          data: {
            status: transition.isComplete ? "COMPLETED" : "IN_PROGRESS",
            endedAt: transition.isComplete ? new Date() : null,
          },
        });
      });

      session = await prisma.interviewSession.findFirstOrThrow({
        where: { id: created.id, userId: user.id },
        include: { questions: { orderBy: { orderIndex: "asc" } } },
      });
    }

    assert.equal(session.status, "COMPLETED");
    assert.ok(session.endedAt);
    assert.equal(session.overallScore, null);

    const scores = [80, 90, 100];
    for (const [index, question] of session.questions.entries()) {
      await prisma.interviewQuestion.update({
        where: { id: question.id },
        data: {
          score: scores[index],
          aiFeedback: `Feedback ${index + 1}`,
        },
      });
    }

    const overallScore = calculateInterviewOverallScore(scores);
    assert.notEqual(overallScore, null);
    await prisma.interviewSession.update({
      where: { id: session.id },
      data: { overallScore },
    });

    const report = await prisma.interviewSession.findFirstOrThrow({
      where: { id: session.id, userId: user.id },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    });
    assert.equal(report.status, "COMPLETED");
    assert.equal(report.overallScore?.toString(), "90");
    assert.deepEqual(
      report.questions.map((question) => question.score?.toString()),
      ["80", "90", "100"]
    );
    assert.deepEqual(
      report.questions.map((question) => question.aiFeedback),
      ["Feedback 1", "Feedback 2", "Feedback 3"]
    );

    assert.deepEqual(
      getInterviewAnswerTransition(
        report.status,
        report.questions,
        report.questions[0]!.id
      ),
      { error: "SESSION_COMPLETED" }
    );
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});
