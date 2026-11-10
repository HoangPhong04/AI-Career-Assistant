"use client";

import { useState, useTransition } from "react";
// Imported from the pure module directly (not the `@/lib/career` barrel):
// the barrel re-exports the skill repository, which imports Prisma and
// would pull Node-only modules into the browser bundle.
import { nextStepStatus, summarizeProgress } from "@/lib/career/progress";
import type { CareerAnalyzeResult } from "@/lib/career/validators";

type Step = {
  id: string;
  status: string;
  orderIndex: number;
};

type SavedRoadmapDetailProps = {
  roadmap: CareerAnalyzeResult;
  steps: Step[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chưa bắt đầu",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  SKIPPED: "Bỏ qua",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "border-neutral-300 bg-neutral-100 text-neutral-600",
  IN_PROGRESS: "border-amber-300 bg-amber-50 text-amber-800",
  COMPLETED: "border-emerald-300 bg-emerald-50 text-emerald-800",
  SKIPPED: "border-neutral-300 bg-neutral-100 text-neutral-400 line-through",
};

export function SavedRoadmapDetail({
  roadmap,
  steps,
}: SavedRoadmapDetailProps) {
  const [statuses, setStatuses] = useState<Record<string, string>>(
    Object.fromEntries(steps.map((step) => [step.id, step.status]))
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const stepsByOrderIndex = new Map(steps.map((step) => [step.orderIndex, step]));
  const { completed, percent } = summarizeProgress(
    steps.map((step) => ({ id: step.id, status: statuses[step.id] ?? step.status }))
  );

  function updateStatus(stepId: string) {
    const current = statuses[stepId] ?? "PENDING";
    const next = nextStepStatus(current);
    setError("");
    setStatuses((previous) => ({ ...previous, [stepId]: next }));

    startTransition(async () => {
      try {
        const response = await fetch("/api/career/roadmap", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stepId, status: next }),
        });
        if (!response.ok) {
          const body: { error?: { message?: string }; message?: string } =
            await response.json().catch(() => ({}));
          setStatuses((previous) => ({ ...previous, [stepId]: current }));
          setError(body.error?.message ?? body.message ?? "Không thể cập nhật tiến độ.");
        }
      } catch {
        setStatuses((previous) => ({ ...previous, [stepId]: current }));
        setError("Không thể kết nối máy chủ khi cập nhật tiến độ.");
      }
    });
  }

  return (
    <div className="mt-6">
      <header className="rounded-xl border border-neutral-200 bg-white p-6">
        <p className="text-sm font-medium text-emerald-800">Lộ trình đã lưu</p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-950">
          {roadmap.targetRole}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Cấp bậc hiện tại: {roadmap.targetLevel}
          {roadmap.roadmap.estimatedMonths &&
            ` · Thời gian dự kiến: ${roadmap.roadmap.estimatedMonths} tháng`}
        </p>
      </header>

      <section className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-neutral-900">Tiến độ lộ trình</h2>
          <span className="text-lg font-semibold text-neutral-950">
            {completed}/{steps.length}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full rounded-full bg-emerald-700" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-xs text-neutral-500">{percent}% hoàn thành</p>
        {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
      </section>

      <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">Phân tích Skill Gap</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          {roadmap.skillGap.gapSummary}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Điểm khoảng cách
            </p>
            <p className="mt-1 text-2xl font-semibold text-neutral-950">
              {roadmap.skillGap.overallGapScore}/100
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Kỹ năng đã có
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {roadmap.skillGap.matchedSkills.length > 0
                ? roadmap.skillGap.matchedSkills.map((skill) => (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800" key={skill}>
                      {skill}
                    </span>
                  ))
                : <span className="text-sm text-neutral-500">Chưa xác định</span>}
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {roadmap.skillGap.gapSkills.map((skill) => (
            <article className="rounded-lg border border-neutral-200 p-3" key={skill.skill}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-neutral-900">{skill.skill}</h3>
                <span className="text-xs text-neutral-500">{skill.importance}</span>
              </div>
              {skill.reason && <p className="mt-1 text-sm text-neutral-600">{skill.reason}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">Các giai đoạn phát triển</h2>
        <div className="mt-4 space-y-5">
          {roadmap.roadmap.phases.map((phase, phaseIndex) => (
            <article className="rounded-xl border border-neutral-200 bg-white p-6" key={`${phase.phase}-${phaseIndex}`}>
              <h3 className="text-base font-semibold text-neutral-900">{phase.phase}</h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-neutral-600">
                {phase.goals.map((goal) => <li key={goal}>{goal}</li>)}
              </ul>
              <div className="mt-4 space-y-3">
                {phase.tasks.map((task, taskIndex) => {
                  const step = stepsByOrderIndex.get(phaseIndex * 100 + taskIndex);
                  const status = step ? statuses[step.id] ?? step.status : "PENDING";
                  return (
                    <div className="rounded-lg border border-neutral-200 p-4" key={`${task.title}-${taskIndex}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-medium text-neutral-900">{task.title}</h4>
                          {task.description && <p className="mt-1 text-sm text-neutral-600">{task.description}</p>}
                        </div>
                        {step && (
                          <button
                            className={`shrink-0 rounded border px-2 py-1 text-xs font-medium disabled:opacity-50 ${STATUS_STYLE[status] ?? STATUS_STYLE.PENDING}`}
                            disabled={isPending}
                            onClick={() => updateStatus(step.id)}
                            type="button"
                          >
                            {STATUS_LABEL[status] ?? STATUS_LABEL.PENDING}
                          </button>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-500">
                        {task.estimatedDays && <span>~{task.estimatedDays} ngày</span>}
                        {task.milestones.length > 0 && <span>{task.milestones.length} mốc</span>}
                      </div>
                      {task.resources.length > 0 && (
                        <ul className="mt-3 space-y-1 border-t border-neutral-200 pt-3 text-sm">
                          {task.resources.map((resource) => (
                            <li key={`${task.title}-${resource.title}`}>
                              {resource.url ? (
                                <a className="text-emerald-800 underline" href={resource.url} rel="noreferrer noopener" target="_blank">
                                  {resource.title}
                                </a>
                              ) : resource.title}
                              {resource.duration && <span className="ml-2 text-xs text-neutral-400">({resource.duration})</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      {roadmap.careerAdvice && (
        <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-neutral-900">Lời khuyên sự nghiệp</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            {([
              { title: "Ngay lập tức", items: roadmap.careerAdvice.immediate },
              { title: "Ngắn hạn", items: roadmap.careerAdvice.shortTerm },
              { title: "Dài hạn", items: roadmap.careerAdvice.longTerm },
            ] as const).map(({ title, items }) => (
              <div key={title}>
                <h3 className="text-sm font-medium text-neutral-700">{title}</h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-neutral-600">
                  {items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
