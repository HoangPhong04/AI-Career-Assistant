"use client";

import { useEffect, useState, type FormEvent } from "react";

type InterviewQuestion = {
  id: string;
  orderIndex: number;
  questionText: string;
  questionType: string;
  userAnswer: string | null;
  aiFeedback: string | null;
  score: number | string | null;
};

type InterviewSession = {
  id: string;
  position: string;
  level: string | null;
  type: string | null;
  status: string;
  createdAt: string;
  questions: InterviewQuestion[];
};

type ApiError = { error?: { message?: string } };
type SessionResponse = { session: InterviewSession };

const LEVELS = ["fresher", "junior", "mid", "senior"] as const;
const TYPES = [
  { value: "MIXED", label: "Kết hợp" },
  { value: "TECHNICAL", label: "Kỹ thuật" },
  { value: "BEHAVIORAL", label: "Hành vi" },
] as const;

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as ApiError;
  return body.error?.message ?? "Đã xảy ra lỗi. Vui lòng thử lại.";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function InterviewSimulator() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [difficulty, setDifficulty] =
    useState<(typeof LEVELS)[number]>("junior");
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("MIXED");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evaluatingQuestionId, setEvaluatingQuestionId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSessions() {
      try {
        const response = await fetch("/api/interview/session");
        if (!response.ok) throw new Error(await readError(response));
        const body = (await response.json()) as {
          sessions: InterviewSession[];
        };
        if (!active) return;
        setSessions(body.sessions);
        setSession(
          body.sessions.find((item) => item.status !== "COMPLETED") ?? null
        );
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể tải danh sách buổi phỏng vấn."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSessions();
    return () => {
      active = false;
    };
  }, []);

  const currentQuestion =
    session?.questions.find((question) => question.userAnswer === null) ?? null;
  const completedCount =
    session?.questions.filter((question) => question.userAnswer !== null)
      .length ?? 0;

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCreating(true);

    try {
      const response = await fetch("/api/interview/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          difficulty,
          type,
          questionCount: 5,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));

      const body = (await response.json()) as SessionResponse;
      setSession(body.session);
      setSessions((current) => [
        body.session,
        ...current.filter((item) => item.id !== body.session.id),
      ]);
      setAnswer("");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Không thể tạo buổi phỏng vấn."
      );
    } finally {
      setCreating(false);
    }
  }

  async function evaluateAnswer(
    sessionId: string,
    questionId: string
  ): Promise<void> {
    setError("");
    setEvaluatingQuestionId(questionId);
    try {
      const response = await fetch("/api/interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, questionId }),
      });
      if (!response.ok) throw new Error(await readError(response));

      const body = (await response.json()) as {
        evaluation: { feedback: string; score: number | string };
      };
      const updateQuestion = (item: InterviewQuestion) =>
        item.id === questionId
          ? {
              ...item,
              aiFeedback: body.evaluation.feedback,
              score: body.evaluation.score,
            }
          : item;
      setSession((current) =>
        current
          ? { ...current, questions: current.questions.map(updateQuestion) }
          : current
      );
      setSessions((current) =>
        current.map((item) => ({
          ...item,
          questions: item.questions.map(updateQuestion),
        }))
      );
    } catch (evaluationError) {
      setError(
        evaluationError instanceof Error
          ? evaluationError.message
          : "Không thể tạo nhận xét cho câu trả lời."
      );
    } finally {
      setEvaluatingQuestionId("");
    }
  }

  async function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !currentQuestion) return;
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/interview/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          questionId: currentQuestion.id,
          answer,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));

      const body = (await response.json()) as SessionResponse;
      setSession(body.session);
      setSessions((current) =>
        current.map((item) => (item.id === body.session.id ? body.session : item))
      );
      setAnswer("");
      await evaluateAnswer(body.session.id, currentQuestion.id);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Không thể gửi câu trả lời."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resumeSession(selected: InterviewSession) {
    setSession(selected);
    setAnswer("");
    setError("");
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-10" aria-busy="true">
        <p className="text-sm text-slate-500">Đang tải buổi phỏng vấn...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-violet-700">
          Luyện tập cùng AI
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Interview Simulator
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Chọn vị trí và cấp độ để tạo bộ câu hỏi. Trả lời lần lượt và nhận
          phản hồi sau mỗi câu.
        </p>
      </div>

      {error && (
        <p
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {!session ? (
            <form className="space-y-5" onSubmit={createSession}>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Bắt đầu buổi luyện tập
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  AI sẽ chuẩn bị 5 câu hỏi phù hợp với vị trí bạn chọn.
                </p>
              </div>

              <label className="block text-sm font-medium text-slate-800">
                Vị trí ứng tuyển
                <input
                  autoComplete="off"
                  className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20"
                  maxLength={100}
                  minLength={2}
                  onChange={(event) => setTargetRole(event.target.value)}
                  placeholder="Ví dụ: Backend Developer"
                  required
                  value={targetRole}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-800">
                  Cấp độ
                  <select
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20"
                    onChange={(event) =>
                      setDifficulty(event.target.value as (typeof LEVELS)[number])
                    }
                    value={difficulty}
                  >
                    {LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-800">
                  Loại phỏng vấn
                  <select
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20"
                    onChange={(event) =>
                      setType(event.target.value as (typeof TYPES)[number]["value"])
                    }
                    value={type}
                  >
                    {TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                className="rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={creating || targetRole.trim().length < 2}
                type="submit"
              >
                {creating ? "Đang tạo câu hỏi..." : "Tạo buổi phỏng vấn"}
              </button>
            </form>
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    {session.position}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {session.level} ·{" "}
                    {TYPES.find((option) => option.value === session.type)
                      ?.label ?? "Phỏng vấn"}{" "}
                    · {formatDate(session.createdAt)}
                  </p>
                </div>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-medium text-violet-700">
                  {completedCount}/{session.questions.length} câu
                </span>
              </div>

              <div
                className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"
                aria-label={`Tiến độ: ${completedCount} trên ${session.questions.length} câu`}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={session.questions.length}
                aria-valuenow={completedCount}
              >
                <div
                  className="h-full rounded-full bg-violet-600 transition-all"
                  style={{
                    width: `${(completedCount / session.questions.length) * 100}%`,
                  }}
                />
              </div>

              {currentQuestion ? (
                <form className="mt-8 space-y-5" onSubmit={submitAnswer}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">
                      Câu {currentQuestion.orderIndex + 1} ·{" "}
                      {currentQuestion.questionType === "BEHAVIORAL"
                        ? "Hành vi"
                        : "Kỹ thuật"}
                    </p>
                    <h3 className="mt-3 text-lg font-semibold leading-7 text-slate-950">
                      {currentQuestion.questionText}
                    </h3>
                  </div>

                  <label className="block text-sm font-medium text-slate-800">
                    Câu trả lời của bạn
                    <textarea
                      className="mt-2 block min-h-40 w-full resize-y rounded-xl border border-slate-300 px-3 py-3 leading-6 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20"
                      maxLength={10_000}
                      onChange={(event) => setAnswer(event.target.value)}
                      placeholder="Trình bày câu trả lời của bạn..."
                      required
                      value={answer}
                    />
                  </label>

                  <button
                    className="rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={submitting || !answer.trim()}
                    type="submit"
                  >
                    {submitting ? "Đang lưu câu trả lời..." : "Gửi câu trả lời"}
                  </button>
                </form>
              ) : (
                <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                  <h3 className="font-semibold text-emerald-950">
                    Bạn đã hoàn thành buổi phỏng vấn
                  </h3>
                  <p className="mt-1 text-sm text-emerald-800">
                    Xem lại các câu trả lời và phản hồi bên dưới.
                  </p>
                </div>
              )}

              <div className="mt-8 space-y-4">
                {session.questions
                  .filter((question) => question.userAnswer !== null)
                  .map((question) => (
                    <article
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      key={question.id}
                    >
                      <h3 className="text-sm font-semibold text-slate-900">
                        {question.orderIndex + 1}. {question.questionText}
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {question.userAnswer}
                      </p>
                      {question.aiFeedback ? (
                        <div className="mt-3 rounded-lg border border-violet-100 bg-white p-3">
                          <p className="text-sm font-semibold text-violet-900">
                            Phản hồi AI
                            {question.score !== null &&
                              ` · ${question.score}/100`}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {question.aiFeedback}
                          </p>
                        </div>
                      ) : (
                        <button
                          className="mt-3 text-sm font-semibold text-violet-700 underline-offset-4 hover:underline disabled:opacity-60"
                          disabled={evaluatingQuestionId === question.id}
                          onClick={() =>
                            void evaluateAnswer(session.id, question.id)
                          }
                          type="button"
                        >
                          {evaluatingQuestionId === question.id
                            ? "Đang tạo phản hồi..."
                            : "Tạo phản hồi cho câu này"}
                        </button>
                      )}
                    </article>
                  ))}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-950">Buổi gần đây</h2>
              <button
                className="text-sm font-medium text-violet-700 hover:underline"
                onClick={() => {
                  setSession(null);
                  setAnswer("");
                  setError("");
                }}
                type="button"
              >
                Buổi mới
              </button>
            </div>
            {sessions.length ? (
              <ul className="mt-4 space-y-2">
                {sessions.map((item) => (
                  <li key={item.id}>
                    <button
                      aria-current={session?.id === item.id ? "true" : undefined}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        session?.id === item.id
                          ? "border-violet-300 bg-violet-50"
                          : "border-slate-100 hover:bg-slate-50"
                      }`}
                      onClick={() => resumeSession(item)}
                      type="button"
                    >
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {item.position}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {item.status === "COMPLETED"
                          ? "Đã hoàn thành"
                          : `${item.questions.filter((question) => question.userAnswer !== null).length}/${item.questions.length} câu`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Các buổi luyện tập đã tạo sẽ xuất hiện ở đây.
              </p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
