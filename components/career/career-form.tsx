"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
// Imported from the pure module directly (not the `@/lib/career` barrel):
// the barrel re-exports the skill repository, which imports Prisma and
// would pull Node-only modules into the browser bundle.
import { cvSelectionHint, resolveSkillPayload, validateRoleInput } from "@/lib/career/progress";
import { readQuotaError } from "@/lib/ai/quota-client";
import { QuotaNotice } from "@/components/shared/quota-notice";
import { SkillGapView } from "./skill-gap-view";
import { RoadmapView } from "./roadmap-view";
import { CAREER_LEVEL_LABEL } from "@/lib/career/labels";

const LEVELS = ["fresher", "junior", "mid", "senior", "lead"] as const;

function readError(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const error = (body as { error?: { message?: string } }).error;
  if (error && typeof error.message === "string") return error.message;
  // Some legacy routes may return `{ message }` directly.
  const msg = (body as { message?: unknown }).message;
  return typeof msg === "string" ? msg : undefined;
}

type AnalyzeResponse = {
  skillGap: {
    targetRole: string;
    currentLevel: string;
    gapSkills: SkillGapItem[];
    matchedSkills: string[];
    overallGapScore: number;
    gapSummary: string;
  };
};

type SkillGapItem = {
  skill: string;
  category: "technical" | "soft";
  importance: "must-have" | "nice-to-have";
  reason?: string;
  suggestedResources: Resource[];
};

type Resource = {
  type: "course" | "book" | "article" | "project" | "certification";
  title: string;
  url?: string;
  duration?: string;
};

type RoadmapResponse = {
  roadmapId: string;
  stepIds: string[];
  targetRole: string;
  targetLevel: string;
  skillGap: AnalyzeResponse["skillGap"];
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

type Phase = {
  phase: string;
  goals: string[];
  tasks: Task[];
};

type Task = {
  title: string;
  description?: string;
  estimatedDays?: number;
  resources: Resource[];
  milestones: string[];
};

type CVOption = {
  id: string;
  originalName: string;
  skills: {
    technical: string[];
    soft: string[];
  };
  origin: "skill-table" | "analysis-json" | "none";
};

export function CareerForm() {
  const router = useRouter();
  const [targetRole, setTargetRole] = useState("");
  const [currentLevel, setCurrentLevel] = useState<typeof LEVELS[number]>("junior");
  const [cvOptions, setCvOptions] = useState<CVOption[]>([]);
  const [selectedCvId, setSelectedCvId] = useState("");
  /** The level the user wants to reach — drives the roadmap's target. */
  const [targetLevel, setTargetLevel] = useState<typeof LEVELS[number]>("junior");
  const [view, setView] = useState<"form" | "gap" | "roadmap">("form");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  /** Set when the AI daily quota is exhausted — shown as a dedicated notice. */
  const [quotaError, setQuotaError] = useState<{ message: string; resetsAt?: number } | null>(null);
  const [roleError, setRoleError] = useState("");
  const [skillGapResult, setSkillGapResult] = useState<AnalyzeResponse["skillGap"] | null>(null);
  const [roadmapResult, setRoadmapResult] = useState<RoadmapResponse | null>(null);
  useEffect(() => {
    async function loadCVOptions() {
      try {
        // Skills are resolved server-side from the `skill` ⨝ `cv_skill` tables
        // written by the CV Analyzer.
        const res = await fetch("/api/career/cv-skills");
        if (!res.ok) return;

        const data: { data?: CVOption[] } = await res.json();
        setCvOptions(data.data ?? []);
      } catch {
        setError("Không thể tải danh sách CV đã phân tích. Bạn vẫn có thể nhập role thủ công.");
      }
    }

    void loadCVOptions();
  }, []);

  /**
   * The skills sent to the AI.
   *
   * With a CV selected we forward the skills resolved from the `skill` ⨝
   * `cv_skill` tables. Without a CV we send nothing — the AI infers a
   * realistic skill profile from the current level and target role instead.
   */
  function selectedSkills() {
    return resolveSkillPayload(selectedCv());
  }

  /** The CV the user picked, if any. */
  function selectedCv() {
    return cvOptions.find((option) => option.id === selectedCvId);
  }

  /**
   * A target role is the only required field — the level and the CV are
   * optional, because the AI can infer the skill profile on its own.
   */
  function validateBeforeSubmit(): boolean {
    const message = validateRoleInput(targetRole);
    setRoleError(message ?? "");
    return message === null;
  }

  /** Số kỹ năng của CV đang chọn — dùng để hiển thị thông báo. */
  const selectedSkillCount = (() => {
    const cv = cvOptions.find((option) => option.id === selectedCvId);
    if (!cv) return 0;
    return (cv.skills.technical?.length ?? 0) + (cv.skills.soft?.length ?? 0);
  })();

  /**
   * The analysis needs a role and a current level. Everything else is
   * optional — without a CV the AI infers the current skills.
   */
  const canAnalyze = targetRole.trim().length > 0;

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setQuotaError(null);

    if (!validateBeforeSubmit()) return;

    setIsAnalyzing(true);

    try {
      const res = await fetch("/api/career/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          currentLevel,
          targetLevel,
          currentSkills: selectedSkills(),
          cvId: selectedCvId || undefined,
        }),
      });

      const responseBody = (await res.json()) as { data?: AnalyzeResponse };
      if (!res.ok) {
        const quota = readQuotaError(responseBody);
        if (quota) {
          setQuotaError(quota);
        } else {
          setError(readError(responseBody) ?? "Phân tích thất bại.");
        }
        return;
      }

      setSkillGapResult(responseBody.data?.skillGap ?? null);
      setView("gap");
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleGenerateRoadmap() {
    setError("");
    setQuotaError(null);

    if (!validateBeforeSubmit()) {
      setView("form");
      return;
    }

    setIsGenerating(true);

    try {
      const roadmapUrl = selectedCvId
        ? `/api/career/roadmap?cvId=${encodeURIComponent(selectedCvId)}`
        : "/api/career/roadmap";
      const res = await fetch(roadmapUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          currentLevel,
          targetLevel,
          currentSkills: selectedSkills(),
          cvId: selectedCvId || undefined,
        }),
      });

      const responseBody = (await res.json()) as { data?: RoadmapResponse };
      if (!res.ok) {
        const quota = readQuotaError(responseBody);
        if (quota) {
          setQuotaError(quota);
        } else {
          setError(readError(responseBody) ?? "Tạo lộ trình thất bại.");
        }
        return;
      }

      if (!responseBody.data) {
        setError("Máy chủ không trả về lộ trình.");
        return;
      }
      setRoadmapResult(responseBody.data);
      setView("roadmap");
      // Refresh the server component so the saved-roadmap sidebar updates.
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="w-full">
      {/* ── Step 1: Nhập mục tiêu ── */}
      {view === "form" && (
        <section>
          <div className="mb-1">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Tạo lộ trình nghề nghiệp
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Chọn mục tiêu nghề nghiệp để bắt đầu phân tích kỹ năng và xây dựng lộ trình phù hợp.
            </p>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleAnalyze}>
            <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-800">
              {cvSelectionHint(selectedCvId, selectedSkillCount, cvOptions.length)}
            </p>
            <label className="block text-sm font-medium text-neutral-800">
              Vai trò mục tiêu
              <input
                autoComplete="off"
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                maxLength={100}
                onChange={(e) => {
                  setTargetRole(e.target.value);
                  if (e.target.value.trim()) setRoleError("");
                }}
                placeholder="VD: Senior Frontend Developer, Data Engineer, Kế toán trưởng..."
                value={targetRole}
              />
              {roleError && (
                <span className="mt-1 block text-xs font-normal text-red-700" role="alert">
                  {roleError}
                </span>
              )}
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-neutral-800">
                Cấp bậc hiện tại
                <select
                  className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                  onChange={(e) => setCurrentLevel(e.target.value as typeof LEVELS[number])}
                  value={currentLevel}
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {CAREER_LEVEL_LABEL[l]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-neutral-800">
                Cấp bậc mong muốn
                <select
                  className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                  onChange={(e) => setTargetLevel(e.target.value as typeof LEVELS[number])}
                  value={targetLevel}
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {CAREER_LEVEL_LABEL[l]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {targetLevel === currentLevel && (
              <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Cấp bậc hiện tại và cấp bậc mong muốn đang giống nhau. AI sẽ tập trung
                vào các kỹ năng cần thiết để đạt chuẩn cấp bậc đó.
              </p>
            )}

            <label className="block text-sm font-medium text-neutral-800">
              CV đã phân tích
              <select
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                onChange={(e) => setSelectedCvId(e.target.value)}
                value={selectedCvId}
              >
                <option value="">Không chọn CV (AI tự suy luận kỹ năng)</option>
                {cvOptions.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.originalName} · {cv.skills.technical.length + cv.skills.soft.length} kỹ năng
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs font-normal text-neutral-500">
                Chọn CV để AI sử dụng kỹ năng đã trích xuất. Bỏ qua nếu muốn AI tự suy luận.
              </span>
            </label>


            {quotaError && (
              <QuotaNotice
                message={quotaError.message}
                resetsAt={quotaError.resetsAt}
              />
            )}

            {error && (
              <p className="text-sm text-red-700" role="alert">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                className="rounded-xl bg-emerald-800 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isAnalyzing || !targetRole.trim() || !canAnalyze}
                type="submit"
              >
                {isAnalyzing ? "Đang phân tích..." : "Phân tích khoảng cách kỹ năng"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ── Step 2: Skill Gap ── */}
      {view === "gap" && skillGapResult && (
        <section>
          <SkillGapView
            skillGap={skillGapResult}
            onBack={() => setView("form")}
            onGenerateRoadmap={handleGenerateRoadmap}
            isGenerating={isGenerating}
            error={error}
            quotaError={quotaError}
          />
        </section>
      )}

      {/* ── Step 3: Roadmap ── */}
      {view === "roadmap" && roadmapResult && (
        <section>
          <RoadmapView
            roadmap={roadmapResult}
            onBack={() => {
              setSkillGapResult(roadmapResult.skillGap);
              setView("gap");
            }}
          />
        </section>
      )}
    </div>
  );
}
