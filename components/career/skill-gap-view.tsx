"use client";

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

type SkillGapViewProps = {
  skillGap: {
    targetRole: string;
    currentLevel: string;
    gapSkills: SkillGapItem[];
    matchedSkills: string[];
    overallGapScore: number;
    gapSummary: string;
  };
  onBack: () => void;
  onGenerateRoadmap: () => void;
  isGenerating: boolean;
  error: string;
};

const categoryLabel: Record<SkillGapItem["category"], string> = {
  technical: "Kỹ thuật",
  soft: "Kỹ năng mềm",
};

const importanceLabel: Record<SkillGapItem["importance"], string> = {
  "must-have": "Bắt buộc",
  "nice-to-have": "Nên có",
};

export function SkillGapView({
  skillGap,
  onBack,
  onGenerateRoadmap,
  isGenerating,
  error,
}: SkillGapViewProps) {
  const mustHave = skillGap.gapSkills.filter((s) => s.importance === "must-have");
  const niceToHave = skillGap.gapSkills.filter((s) => s.importance === "nice-to-have");

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">Phân tích Skill Gap</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Mục tiêu: <span className="font-medium text-neutral-700">{skillGap.targetRole}</span>{" "}
            · Cấp bậc: <span className="font-medium text-neutral-700">{skillGap.currentLevel}</span>
          </p>
        </div>
        <button
          className="shrink-0 rounded border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          onClick={onBack}
          type="button"
        >
          ← Đổi mục tiêu
        </button>
      </div>

      {/* Gap Score */}
      <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-neutral-700">Điểm khoảng cách kỹ năng</span>
          <span className="text-2xl font-semibold text-neutral-950">{skillGap.overallGapScore}/100</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-emerald-700 transition-all"
            style={{ width: `${skillGap.overallGapScore}%` }}
          />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">{skillGap.gapSummary}</p>
      </div>

      {/* Matched skills */}
      {skillGap.matchedSkills.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-neutral-900">
            Kỹ năng đã có ({skillGap.matchedSkills.length})
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {skillGap.matchedSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200"
              >
                ✓ {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Must-have gap skills */}
      {mustHave.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-neutral-900">
            Kỹ năng bắt buộc còn thiếu ({mustHave.length})
          </h3>
          <div className="mt-3 space-y-3">
            {mustHave.map((item) => (
              <SkillCard key={item.skill} item={item} highlight />
            ))}
          </div>
        </div>
      )}

      {/* Nice-to-have gap skills */}
      {niceToHave.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-neutral-900">
            Kỹ năng nên có ({niceToHave.length})
          </h3>
          <div className="mt-3 space-y-3">
            {niceToHave.map((item) => (
              <SkillCard key={item.skill} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* No gap at all */}
      {skillGap.gapSkills.length === 0 && (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-sm font-medium text-emerald-900">
            Bạn đã có đủ kỹ năng cho vai trò này.
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            Hãy tập trung vào kinh nghiệm thực tế và phỏng vấn.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-6 text-sm text-red-700" role="alert">{error}</p>
      )}

      {/* CTA: Generate roadmap */}
      <div className="mt-8 border-t border-neutral-200 pt-6">
        <button
          className="rounded bg-emerald-800 px-5 py-2.5 font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
          disabled={isGenerating}
          onClick={onGenerateRoadmap}
          type="button"
        >
          {isGenerating ? "Đang tạo lộ trình..." : "Tạo lộ trình chi tiết"}
        </button>
      </div>
    </div>
  );
}

function SkillCard({ item, highlight }: { item: SkillGapItem; highlight?: boolean }) {
  return (
    <article
      className={`rounded-lg border p-4 ${
        highlight
          ? "border-red-200 bg-red-50/40"
          : "border-neutral-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-medium text-neutral-900">{item.skill}</h4>
          <div className="mt-1 flex flex-wrap gap-2">
            <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
              {categoryLabel[item.category]}
            </span>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                item.importance === "must-have"
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {importanceLabel[item.importance]}
            </span>
          </div>
        </div>
      </div>

      {item.reason && (
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">{item.reason}</p>
      )}

      {item.suggestedResources.length > 0 && (
        <div className="mt-3 border-t border-neutral-200/70 pt-3">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            Tài nguyên gợi ý
          </p>
          <ul className="mt-2 space-y-1.5">
            {item.suggestedResources.map((res, idx) => (
              <li key={`${item.skill}-res-${idx}`} className="flex flex-wrap items-baseline gap-2">
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
    </article>
  );
}