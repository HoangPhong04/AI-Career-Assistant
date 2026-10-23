"use client";

import { useState } from "react";

type SavedRoadmap = {
  id: string;
  targetRole: string;
  targetLevel: string | null;
  status: string;
  totalSteps: number;
  updatedAt: string;
};

type SavedRoadmapListProps = {
  roadmaps: SavedRoadmap[];
};

function readErrorMessage(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const error = (body as { error?: { message?: string } }).error;
  if (error && typeof error.message === "string") return error.message;
  const msg = (body as { message?: unknown }).message;
  return typeof msg === "string" ? msg : undefined;
}

export function SavedRoadmapList({ roadmaps }: SavedRoadmapListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSelect(id: string) {
    if (selectedId === id) {
      setSelectedId(null);
      setDetail(null);
      return;
    }

    setSelectedId(id);
    setIsLoading(true);
    setError("");
    setDetail(null);

    try {
      const res = await fetch(`/api/career/roadmap?id=${encodeURIComponent(id)}`);
      const data: { roadmap?: unknown; error?: { message?: string } } = await res.json();

      if (!res.ok) {
        setError(readErrorMessage(data) ?? "Không thể tải lộ trình.");
        return;
      }

      setDetail(data.roadmap);
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
        Lộ trình đã lưu
      </h2>

      {roadmaps.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-500">
          Chưa có lộ trình nào. Tạo roadmap đầu tiên để bắt đầu theo dõi tiến độ.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {roadmaps.map((roadmap) => {
            const isSelected = selectedId === roadmap.id;

            return (
              <li key={roadmap.id}>
                <button
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/50"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                  }`}
                  onClick={() => handleSelect(roadmap.id)}
                  type="button"
                >
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {roadmap.targetRole}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {roadmap.targetLevel ?? "—"} · {roadmap.totalSteps} nhiệm vụ
                  </p>
                  <p className="mt-1 text-[11px] text-neutral-400">
                    {new Date(roadmap.updatedAt).toLocaleDateString("vi-VN")}
                  </p>
                </button>

                {isSelected && (
                  <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    {isLoading ? (
                      <p className="text-xs text-neutral-500">Đang tải...</p>
                    ) : error ? (
                      <p className="text-xs text-red-700" role="alert">{error}</p>
                    ) : detail ? (
                      <RoadmapPreview data={detail} />
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

type StepRow = {
  id: string;
  title: string;
  status: string;
  orderIndex: number;
};

type RoadmapDetail = {
  targetRole: string;
  targetLevel: string | null;
  status: string;
  steps: StepRow[];
};

const STEP_STATUS_STYLE: Record<string, string> = {
  PENDING: "text-neutral-400",
  IN_PROGRESS: "text-amber-700",
  COMPLETED: "text-emerald-700",
  SKIPPED: "text-neutral-400 line-through",
};

const STEP_STATUS_ICON: Record<string, string> = {
  PENDING: "○",
  IN_PROGRESS: "◐",
  COMPLETED: "●",
  SKIPPED: "⊘",
};

function RoadmapPreview({ data }: { data: unknown }) {
  const roadmap = data as RoadmapDetail;
  const steps = roadmap.steps ?? [];

  const completed = steps.filter((s) => s.status === "COMPLETED").length;
  const percent = steps.length === 0 ? 0 : Math.round((completed / steps.length) * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-neutral-700">Tiến độ</span>
        <span className="text-sm font-semibold text-neutral-900">
          {completed}/{steps.length}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-emerald-700 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      {steps.length > 0 && (
        <ul className="mt-3 max-h-64 space-y-1 overflow-auto">
          {steps.map((step) => (
            <li key={step.id} className="flex items-start gap-2 text-xs">
              <span
                className={`mt-px shrink-0 ${STEP_STATUS_STYLE[step.status] ?? "text-neutral-400"}`}
              >
                {STEP_STATUS_ICON[step.status] ?? "○"}
              </span>
              <span className={STEP_STATUS_STYLE[step.status] ?? "text-neutral-700"}>
                {step.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}