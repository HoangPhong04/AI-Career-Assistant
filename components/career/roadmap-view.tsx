"use client";

import { useState, useTransition } from "react";

type Resource = {
  type: "course" | "book" | "article" | "project" | "certification";
  title: string;
  url?: string;
  duration?: string;
};

type Task = {
  title: string;
  description?: string;
  estimatedDays?: number;
  resources: Resource[];
  milestones: string[];
};

type Phase = {
  phase: string;
  goals: string[];
  tasks: Task[];
};

type RoadmapViewProps = {
  roadmap: {
    roadmapId: string;
    /** Persisted RoadmapStep ids, in the same order as the flattened task list. */
    stepIds: string[];
    targetRole: string;
    targetLevel: string;
    roadmap: {
      estimatedMonths?: number;
      phases: Phase[];
      totalEstimatedDays?: number;
    };
    careerAdvice?: {
      immediate: string[];
      shortTerm: string[];
      longTerm: string[];
    };
  };
  onBack: () => void;
};

type StepStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";

const STATUS_LABEL: Record<StepStatus, string> = {
  PENDING: "Chưa bắt đầu",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  SKIPPED: "Bỏ qua",
};

const STATUS_STYLE: Record<StepStatus, string> = {
  PENDING: "bg-neutral-100 text-neutral-600 border-neutral-300",
  IN_PROGRESS: "bg-amber-50 text-amber-800 border-amber-300",
  COMPLETED: "bg-emerald-50 text-emerald-800 border-emerald-300",
  SKIPPED: "bg-neutral-100 text-neutral-400 border-neutral-300 line-through",
};

const NEXT_STATUS: Record<StepStatus, StepStatus> = {
  PENDING: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
  COMPLETED: "PENDING",
  SKIPPED: "PENDING",
};

export function RoadmapView({ roadmap, onBack }: RoadmapViewProps) {
  // stepKey -> status. stepKey is a stable slug from phase+task index.
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({});
  const [isPending, startTransition] = useTransition();

  const allTasks = roadmap.roadmap.phases.flatMap((phase, phaseIdx) =>
    phase.tasks.map((task, taskIdx) => ({
      key: `${phaseIdx}-${taskIdx}`,
      task,
    }))
  );

  const completed = allTasks.filter(
    (t) => statuses[t.key] === "COMPLETED"
  ).length;
  const percent = allTasks.length === 0 ? 0 : Math.round((completed / allTasks.length) * 100);

  function handleStatusChange(stepKey: string, next: StepStatus) {
    // Map the local step key back to its persisted RoadmapStep id.
    const flatIndex = Number(stepKey.split("-")[1]);
    const stepId = roadmap.stepIds[flatIndex];

    // Optimistic update
    const previous = statuses;
    setStatuses((prev) => ({ ...prev, [stepKey]: next }));

    if (!stepId) {
      // No persisted id available — keep the change local only.
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/career/roadmap", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stepId, status: next }),
        });

        if (!res.ok) {
          // Revert on failure
          setStatuses(previous);
        }
      } catch {
        setStatuses(previous);
      }
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">Lộ trình sự nghiệp</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {roadmap.targetRole} · {roadmap.targetLevel}
            {roadmap.roadmap.estimatedMonths && ` · ~${roadmap.roadmap.estimatedMonths} tháng`}
          </p>
        </div>
        <button
          className="shrink-0 rounded border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          onClick={onBack}
          type="button"
        >
          ← Quay lại
        </button>
      </div>

      {/* Progress bar — T8 */}
      <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-neutral-700">Tiến độ lộ trình</span>
          <span className="text-2xl font-semibold text-neutral-950">
            {completed}/{allTasks.length}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-emerald-700 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-neutral-500">{percent}% hoàn thành</p>
      </div>

      {/* Phases */}
      {roadmap.roadmap.phases.map((phase, phaseIdx) => (
        <div key={`${phaseIdx}-${phase.phase}`} className="mt-8">
          <h3 className="text-base font-semibold text-neutral-900">{phase.phase}</h3>

          {phase.goals.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-neutral-600">
              {phase.goals.map((goal) => (
                <li key={goal}>{goal}</li>
              ))}
            </ul>
          )}

          <div className="mt-4 space-y-3">
            {phase.tasks.map((task, taskIdx) => {
              const key = `${phaseIdx}-${taskIdx}`;
              const currentStatus = statuses[key] ?? "PENDING";

              return (
                <article
                  key={key}
                  className={`rounded-lg border p-4 transition-opacity ${
                    currentStatus === "COMPLETED" ? "border-emerald-200 bg-emerald-50/40" : "border-neutral-200 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4
                        className={`font-medium ${
                          currentStatus === "COMPLETED"
                            ? "text-neutral-500 line-through"
                            : "text-neutral-900"
                        }`}
                      >
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                          {task.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-500">
                        {task.estimatedDays && <span>~{task.estimatedDays} ngày</span>}
                        {task.milestones.length > 0 && (
                          <span>{task.milestones.length} mốc</span>
                        )}
                      </div>
                    </div>

                    {/* Status control — T8 */}
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[currentStatus]}`}
                      >
                        {STATUS_LABEL[currentStatus]}
                      </span>
                      <button
                        className="rounded border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                        disabled={isPending}
                        onClick={() => handleStatusChange(key, NEXT_STATUS[currentStatus])}
                        type="button"
                      >
                        {currentStatus === "COMPLETED" ? "↺" : "→"}
                      </button>
                    </div>
                  </div>

                  {task.resources.length > 0 && (
                    <div className="mt-3 border-t border-neutral-200/70 pt-3">
                      <ul className="space-y-1.5">
                        {task.resources.map((res, ridx) => (
                          <li
                            key={`${key}-res-${ridx}`}
                            className="flex flex-wrap items-baseline gap-2"
                          >
                            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-neutral-500">
                              {res.type}
                            </span>
                            {res.url ? (
                              <a
                                className="text-sm text-emerald-800 underline underline-offset-2 hover:text-emerald-900"
                                href={res.url}
                                rel="noreferrer noopener"
                                target="_blank"
                              >
                                {res.title}
                              </a>
                            ) : (
                              <span className="text-sm text-neutral-700">{res.title}</span>
                            )}
                            {res.duration && (
                              <span className="text-xs text-neutral-400">({res.duration})</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {task.milestones.length > 0 && (
                    <div className="mt-3 border-t border-neutral-200/70 pt-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Mốc hoàn thành
                      </p>
                      <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-neutral-600">
                        {task.milestones.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      ))}

      {/* Career advice */}
      {roadmap.careerAdvice && (
        <div className="mt-10 rounded-lg border border-neutral-200 bg-neutral-50 p-5">
          <h3 className="text-sm font-semibold text-neutral-900">Lời khuyên sự nghiệp</h3>
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            <AdviceColumn title="Ngay lập tức" items={roadmap.careerAdvice.immediate} />
            <AdviceColumn title="Ngắn hạn" items={roadmap.careerAdvice.shortTerm} />
            <AdviceColumn title="Dài hạn" items={roadmap.careerAdvice.longTerm} />
          </div>
        </div>
      )}
    </div>
  );
}

function AdviceColumn({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{title}</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-neutral-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}