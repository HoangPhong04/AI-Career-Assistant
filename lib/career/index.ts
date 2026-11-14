/**
 * Career Roadmap — skill gap analysis & roadmap generation.
 *
 * Entry points for other modules:
 *  - `analyzeSkillGap(input)`          → SkillGap
 *  - `generateRoadmap(input)`          → CareerAnalyzeResult
 *  - `buildAnalyzePrompt(input)`       → raw AI prompt (for route handlers)
 *
 * This barrel is safe to import from client components. Database-backed
 * helpers live in `./skill-repository` and must be imported directly:
 *   import { resolveCvSkills } from "@/lib/career/skill-repository";
 */

import {
  CareerAnalyzeInputSchema,
  CareerAnalyzeResultSchema,
  SkillGapSchema,
  type CareerAnalyzeInput,
  type CareerAnalyzeResult,
  type SkillGap,
} from "./validators";

import { aiInternals, stripJsonFence, AICareerError, AIAnalysisError } from "@/lib/ai";

// ─── Prompt templates ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
Bạn là chuyên gia tư vấn phát triển nghề nghiệp và cố vấn kỹ thuật.
Dựa trên vị trí mục tiêu và bộ kỹ năng hiện tại của ứng viên, hãy trả lời
hoàn toàn bằng tiếng Việt, ngoại trừ các giá trị enum và tên khóa JSON được
yêu cầu. Chỉ trả về một đối tượng JSON hợp lệ, không markdown và không thêm
nội dung nào khác.
`.trim();

/**
 * Build the user prompt for skill gap analysis.
 * Called by the route handler so the prompt is auditable in one place.
 */
export function buildSkillGapPrompt(input: CareerAnalyzeInput): string {
  const targetLevel = input.targetLevel ?? input.currentLevel;
  const skills = input.currentSkills
    ? `Kỹ năng hiện tại:\n  Kỹ năng kỹ thuật: ${input.currentSkills.technical.join(", ") || "(trống)"}\n  Kỹ năng mềm: ${input.currentSkills.soft.join(", ") || "(trống)"}`
    : input.cvText
    ? `CV text for you to extract current skills:\n"""\n${input.cvText}\n"""`
    : `Không có nội dung CV hoặc danh sách kỹ năng.
Ứng viên chưa cung cấp kỹ năng, vì vậy hãy SUY LUẬN một hồ sơ kỹ năng thực tế
cho người ở cấp "${input.currentLevel}" của vị trí "${input.targetRole}", sau đó
so sánh với yêu cầu của cấp "${targetLevel}". Nêu rõ giả định trong "gapSummary"
(ví dụ: "Dựa trên tiêu chuẩn cấp ... của vị trí ..., bạn hiện có thể đang ở ...").`;

  return `
Phân tích khoảng cách kỹ năng cho ứng viên hướng tới vị trí "${input.targetRole}"
ở cấp "${targetLevel}". Cấp HIỆN TẠI của ứng viên là "${input.currentLevel}".

${skills}

Trả về đúng cấu trúc JSON sau (không có markdown fence). Nội dung của các
trường văn bản như "reason", "title" và "gapSummary" phải bằng tiếng Việt.
Chỉ trả về tối đa 6 kỹ năng còn thiếu, mỗi kỹ năng tối đa 2 tài nguyên gợi ý,
và giữ phần mô tả ngắn gọn để bảo đảm JSON hoàn chỉnh.
{
  "targetRole": "...",
  "currentLevel": "...",
  "gapSkills": [
    {
      "skill": "Tên kỹ năng",
      "category": "technical | soft",
      "importance": "must-have | nice-to-have",
      "reason": "Lý do khoảng cách này quan trọng với vị trí mục tiêu",
      "suggestedResources": [
        {
          "type": "course | book | article | project | certification",
          "title": "Tên tài nguyên",
          "url": "https://...",
          "duration": "ví dụ: 2 tuần"
        }
      ]
    }
  ],
  "matchedSkills": ["skill 1", "skill 2"],
  "overallGapScore": 0-100,
  "gapSummary": "Tóm tắt khoảng cách trong 1-2 câu bằng tiếng Việt"
}
`.trim();
}

/**
 * Build the user prompt for full roadmap generation (skill gap + roadmap phases).
 * This is the main prompt used by POST /api/career/roadmap.
 */
export function buildRoadmapPrompt(input: CareerAnalyzeInput): string {
  const targetLevel = input.targetLevel ?? input.currentLevel;
  const skills = input.currentSkills
    ? `Kỹ năng hiện tại:\n  Kỹ năng kỹ thuật: ${input.currentSkills.technical.join(", ") || "(trống)"}\n  Kỹ năng mềm: ${input.currentSkills.soft.join(", ") || "(trống)"}`
    : input.cvText
    ? `CV text for you to extract current skills:\n"""\n${input.cvText}\n"""`
    : `Không có nội dung CV hoặc danh sách kỹ năng.
Ứng viên chưa cung cấp kỹ năng. Hãy SUY LUẬN một hồ sơ kỹ năng thực tế cho người
ở cấp "${input.currentLevel}" của vị trí "${input.targetRole}" và dùng hồ sơ đó
làm cơ sở. Nêu rõ giả định trong "skillGap.gapSummary" để người dùng biết kế
hoạch dựa trên giả định thay vì CV của họ.`;

  return `
Bạn là chuyên gia tư vấn phát triển nghề nghiệp. Với ứng viên hướng tới
"${input.targetRole}" ở cấp "${targetLevel}", hãy tạo một lộ trình nghề nghiệp
đầy đủ. Cấp HIỆN TẠI của ứng viên là "${input.currentLevel}".

${skills}

Chỉ trả về JSON sau (không markdown fence). Tất cả nội dung mô tả, mục tiêu,
nhiệm vụ, cột mốc, tài nguyên và lời khuyên phải bằng tiếng Việt. Giữ nguyên
các tên khóa JSON và giá trị enum bằng tiếng Anh để đảm bảo đúng schema.
{
  "targetRole": "...",
  "targetLevel": "...",
  "skillGap": {
    "targetRole": "...",
    "currentLevel": "...",
    "gapSkills": [...],
    "matchedSkills": [...],
    "overallGapScore": 0-100,
    "gapSummary": "..."
  },
  "roadmap": {
    "estimatedMonths": 6,
    "phases": [
      {
        "phase": "Giai đoạn 1: Nền tảng (Tháng 1-2)",
        "goals": ["Mục tiêu 1", "Mục tiêu 2"],
        "tasks": [
          {
            "title": "Tên nhiệm vụ",
            "description": "Mô tả tùy chọn",
            "estimatedDays": 14,
            "resources": [
              { "type": "course | book | article | project | certification", "title": "...", "url": "https://...", "duration": "..." }
            ],
            "milestones": ["Cột mốc 1", "Cột mốc 2"]
          }
        ]
      }
    ],
    "totalEstimatedDays": 180
  },
  "careerAdvice": {
    "immediate": ["Việc cần làm ngay 1", "Việc cần làm ngay 2"],
    "shortTerm": ["Việc cần làm ngắn hạn 1", "Việc cần làm ngắn hạn 2"],
    "longTerm": ["Việc cần làm dài hạn 1", "Việc cần làm dài hạn 2"]
  }
}
`.trim();
}

export function normalizeRoadmapResponse(
  value: unknown,
  input: CareerAnalyzeInput,
  fallback?: { missingSkills?: unknown }
): unknown {
  if (typeof value !== "object" || value === null) return value;

  const response = value as Record<string, unknown>;
  const skillGap =
    typeof response.skillGap === "object" && response.skillGap !== null
      ? { ...(response.skillGap as Record<string, unknown>) }
      : {};

  const rawGapSkills =
    Array.isArray(skillGap.gapSkills) && skillGap.gapSkills.length > 0
      ? skillGap.gapSkills
      : Array.isArray(fallback?.missingSkills)
        ? fallback.missingSkills
        : [];
  const gapSkills = Array.isArray(rawGapSkills)
    ? rawGapSkills.map((item) =>
        typeof item === "string"
          ? {
              skill: item,
              category: "technical",
              importance: "must-have",
              suggestedResources: [],
            }
          : item
      )
    : [];
  const roadmap =
    typeof response.roadmap === "object" && response.roadmap !== null
      ? response.roadmap
      : {
      phases: Array.isArray(response.phases) ? response.phases : [],
      estimatedMonths: response.estimatedMonths,
      totalEstimatedDays: response.totalEstimatedDays,
    };

  return {
    ...response,
    roadmap,
    targetRole:
      typeof response.targetRole === "string"
        ? response.targetRole
        : input.targetRole,
    targetLevel:
      typeof response.targetLevel === "string"
        ? response.targetLevel
        : input.targetLevel ?? input.currentLevel,
    skillGap: {
      ...skillGap,
      targetRole:
        typeof skillGap.targetRole === "string"
          ? skillGap.targetRole
          : typeof response.targetRole === "string"
            ? response.targetRole
            : input.targetRole,
      currentLevel:
        typeof skillGap.currentLevel === "string"
          ? skillGap.currentLevel
          : typeof response.targetLevel === "string"
            ? response.targetLevel
            : input.currentLevel,
      gapSkills,
      matchedSkills: Array.isArray(skillGap.matchedSkills)
        ? skillGap.matchedSkills
        : [],
      overallGapScore:
        typeof skillGap.overallGapScore === "number"
          ? skillGap.overallGapScore
          : 0,
      gapSummary:
        typeof skillGap.gapSummary === "string"
          ? skillGap.gapSummary
          : "Lộ trình này chưa lưu phần tóm tắt skill gap.",
    },
  };
}

// ─── Core logic ────────────────────────────────────────────────────────────────

/**
 * Analyze skill gap only — lightweight, used by the analyze endpoint.
 * Returns a parsed SkillGap or throws AICareerError.
 */
export async function analyzeSkillGap(
  input: CareerAnalyzeInput
): Promise<SkillGap> {
  const parsed = CareerAnalyzeInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AICareerError(
      `Invalid input: ${parsed.error.message}`,
      "INVALID_RESPONSE_SCHEMA"
    );
  }

  const prompt = buildSkillGapPrompt(parsed.data);

  let raw: string;
  try {
    raw = await aiInternals.chatCompletion({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: prompt,
      temperature: 0.3,
      maxTokens: 4096,
    });
  } catch (err) {
    // A quota failure already carries its own code and reset time — it must
    // not be downgraded to a generic request failure.
    if (err instanceof AICareerError) throw err;
    if (err instanceof AIAnalysisError && err.code === "AI_QUOTA_EXCEEDED") {
      throw new AICareerError(err.message, "AI_QUOTA_EXCEEDED", err.resetsAt);
    }
    throw new AICareerError(
      `Phân tích khoảng cách kỹ năng thất bại: ${(err as Error).message}`,
      "AI_REQUEST_FAILED"
    );
  }

  const parseSkillGap = (response: string): SkillGap | null => {
    try {
      const parsed = SkillGapSchema.safeParse(
        JSON.parse(stripJsonFence(response))
      );
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  };

  const parsedSkillGap = parseSkillGap(raw);
  if (parsedSkillGap) return parsedSkillGap;

  console.warn(
    "[career/skill-gap] AI returned incomplete or invalid JSON; retrying with a concise response request."
  );
  const retryRaw = await aiInternals.chatCompletion({
    systemPrompt: `${SYSTEM_PROMPT}
Nếu lần trước trả về JSON chưa hoàn chỉnh, lần này hãy tạo lại từ đầu.
Không cắt ngắn giữa chuỗi hoặc mảng; chỉ trả về JSON hoàn chỉnh.`,
    userMessage: `${prompt}

Hãy trả lời ngắn gọn: tối đa 4 kỹ năng còn thiếu, không cần URL tài nguyên,
nhưng vẫn phải trả về đầy đủ các khóa JSON và đóng mọi dấu ngoặc.`,
    temperature: 0,
    maxTokens: 4096,
  });
  const retriedSkillGap = parseSkillGap(retryRaw);
  if (retriedSkillGap) return retriedSkillGap;

  console.error("[career/skill-gap] AI returned invalid JSON after retry.");
  throw new AICareerError(
    "AI trả về kết quả phân tích không hoàn chỉnh. Vui lòng thử lại.",
    "INVALID_RESPONSE_SCHEMA"
  );
}

/**
 * Generate full roadmap — skill gap + phased plan + career advice.
 * Used by POST /api/career/roadmap.
 * Returns a parsed CareerAnalyzeResult or throws AICareerError.
 */
export async function generateRoadmap(
  input: CareerAnalyzeInput
): Promise<CareerAnalyzeResult> {
  const parsed = CareerAnalyzeInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AICareerError(
      `Invalid input: ${parsed.error.message}`,
      "INVALID_RESPONSE_SCHEMA"
    );
  }

  const prompt = buildRoadmapPrompt(parsed.data);

  let raw: string;
  try {
    raw = await aiInternals.chatCompletion({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: prompt,
      temperature: 0.3,
      maxTokens: 4096,
    });
  } catch (err) {
    // A quota failure already carries its own code and reset time — it must
    // not be downgraded to a generic request failure.
    if (err instanceof AICareerError) throw err;
    if (err instanceof AIAnalysisError && err.code === "AI_QUOTA_EXCEEDED") {
      throw new AICareerError(err.message, "AI_QUOTA_EXCEEDED", err.resetsAt);
    }
    throw new AICareerError(
      `Tạo lộ trình nghề nghiệp thất bại: ${(err as Error).message}`,
      "AI_REQUEST_FAILED"
    );
  }

  try {
    const rawResponse = JSON.parse(stripJsonFence(raw));
    const parsed_2 = CareerAnalyzeResultSchema.safeParse(
      normalizeRoadmapResponse(rawResponse, parsed.data)
    );
    if (!parsed_2.success) {
      console.error("[career/roadmap] Schema errors:", parsed_2.error.flatten());
      console.error("[career/roadmap] Raw response:", raw);
      throw new AICareerError(
        `AI response does not match roadmap schema: ${parsed_2.error.message}`,
        "INVALID_RESPONSE_SCHEMA"
      );
    }
    return parsed_2.data;
  } catch (err) {
    if (err instanceof AICareerError) throw err;
    console.error("[career/roadmap] Parse error:", err);
    throw new AICareerError(
      "Không thể đọc kết quả lộ trình nghề nghiệp từ AI.",
      "INVALID_RESPONSE_SCHEMA"
    );
  }
}

// ─── Re-export validators for convenience ───────────────────────────────────

export {
  CareerAnalyzeInputSchema,
  CareerAnalyzeResultSchema,
  SkillGapSchema,
} from "./validators";

export type {
  CareerAnalyzeInput,
  CareerAnalyzeResult,
  SkillGap,
  SkillGapItem,
  RoadmapPhase,
  RoadmapStepUpdate,
  RoadmapProgress,
} from "./validators";

// ─── Skill source ────────────────────────────────────────────────────────────
//
// The database-backed helpers live in `./skill-repository` and are NOT
// re-exported here: that module imports Prisma, and re-exporting it would
// pull Node-only modules into any browser bundle that imports this barrel.
//
// Server-side consumers import them directly:
//   import { resolveCvSkills } from "@/lib/career/skill-repository";

export { getSkillsFromAnalysisJson, normalizeSkillCategory } from "./skill-repository";

export type { CvSkillSource, SkillSets } from "./skill-repository";

// ─── Re-export progress helpers for convenience ──────────────────────────────

export {
  buildRoadmapProgress,
  cvSelectionHint,
  nextStepStatus,
  resolveSkillPayload,
  summarizeProgress,
  validateRoleInput,
  COMPLETED_STATUS,
} from "./progress";

export type { ProgressStep } from "./progress";
