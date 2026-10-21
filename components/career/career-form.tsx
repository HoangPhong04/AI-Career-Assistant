"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SkillGapView } from "./skill-gap-view";
import { RoadmapView } from "./roadmap-view";

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

export function CareerForm() {
  const router = useRouter();
  const [targetRole, setTargetRole] = useState("");
  const [currentLevel, setCurrentLevel] = useState<typeof LEVELS[number]>("junior");
  const [view, setView] = useState<"form" | "gap" | "roadmap">("form");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [skillGapResult, setSkillGapResult] = useState<AnalyzeResponse["skillGap"] | null>(null);
  const [roadmapResult, setRoadmapResult] = useState<RoadmapResponse | null>(null);

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsAnalyzing(true);

    try {
      const res = await fetch("/api/career/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRole, currentLevel }),
      });

      const data: AnalyzeResponse = await res.json();
      if (!res.ok) {
        setError(readError(data) ?? "Phân tích thất bại.");
        return;
      }

      setSkillGapResult(data.skillGap);
      setView("gap");
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleGenerateRoadmap() {
    setError("");
    setIsGenerating(true);

    try {
      const res = await fetch("/api/career/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRole, currentLevel }),
      });

      const data: RoadmapResponse = await res.json();
      if (!res.ok) {
        setError(readError(data) ?? "Tạo lộ trình thất bại.");
        return;
      }

      setRoadmapResult(data);
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
    <div className="mx-auto w-full max-w-3xl">
      {/* ── Step 1: Nhập mục tiêu ── */}
      {view === "form" && (
        <section>
          <div className="mb-1">
            <h2 className="text-lg font-semibold text-neutral-950">
              Xây dựng lộ trình sự nghiệp
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Nhập vai trò mục tiêu và cấp bậc hiện tại để phân tích khoảng cách kỹ năng
              và nhận lộ trình phát triển chi tiết.
            </p>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleAnalyze}>
            <label className="block text-sm font-medium text-neutral-800">
              Vai trò mục tiêu
              <input
                autoComplete="off"
                className="mt-2 block w-full rounded border border-neutral-300 px-3 py-2.5 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                maxLength={100}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="VD: Senior Frontend Developer, Data Engineer..."
                required
                value={targetRole}
              />
            </label>

            <label className="block text-sm font-medium text-neutral-800">
              Cấp bậc hiện tại
              <select
                className="mt-2 block w-full rounded border border-neutral-300 px-3 py-2.5 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                onChange={(e) => setCurrentLevel(e.target.value as typeof LEVELS[number])}
                value={currentLevel}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l.charAt(0).toUpperCase() + l.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            {error && (
              <p className="text-sm text-red-700" role="alert">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                className="rounded bg-emerald-800 px-5 py-2.5 font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
                disabled={isAnalyzing || !targetRole.trim()}
                type="submit"
              >
                {isAnalyzing ? "Đang phân tích..." : "Phân tích Skill Gap"}
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
