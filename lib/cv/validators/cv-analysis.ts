import { z } from "zod";

export const CVAnalysisResultSchema = z.object({
  isCV: z.boolean().catch(false),

  rejectionReason: z.string().nullable().optional().catch(null),

  personalInfo: z
    .object({
      fullName: z.string().nullable().optional().catch(null),
      email: z.string().nullable().optional().catch(null),
      phone: z.string().nullable().optional().catch(null),
      summary: z.string().nullable().optional().catch(null),
    })
    .catch({ fullName: null, email: null, phone: null, summary: null }),

  // ── Trình độ ứng viên ────────────────────────────────────────────────────
  experienceLevel: z
    .enum(["fresher", "junior", "mid", "senior", "lead"])
    .catch("fresher")
    .describe("Estimated career level based on years of experience and skill depth"),

  yearsOfExperience: z
    .number()
    .min(0)
    .max(50)
    .nullable()
    .catch(null)
    .describe("Estimated total years of professional experience from CV"),

  skills: z
    .object({
      technical: z.array(z.string()).catch([]),
      soft: z.array(z.string()).catch([]),
    })
    .catch({ technical: [], soft: [] }),

  experience: z
    .array(
      z.object({
        company: z.string().catch(""),
        role: z.string().catch(""),
        duration: z.string().nullable().optional().catch(null),
        highlights: z.array(z.string()).catch([]),
      })
    )
    .catch([]),

  education: z
    .array(
      z.object({
        institution: z.string().catch(""),
        degree: z.string().nullable().optional().catch(null),
        major: z.string().nullable().optional().catch(null),
        graduationYear: z.string().nullable().optional().catch(null),
      })
    )
    .optional()
    .default([])
    .catch([]),

  // ── Chứng chỉ ───────────────────────────────────────────────────────────
  certifications: z
    .array(
      z.object({
        name: z.string().catch(""),
        issuer: z.string().nullable().optional().catch(null),
        year: z.string().nullable().optional().catch(null),
      })
    )
    .optional()
    .default([])
    .catch([])
    .describe("Professional certifications, licenses, or accreditations"),

  // ── Dự án cá nhân / thực tế ─────────────────────────────────────────────
  projects: z
    .array(
      z.object({
        name: z.string().catch("Dự án"),
        description: z.string().nullable().optional().catch(null),
        technologies: z.preprocess((val) => {
          if (Array.isArray(val)) return val.map(String);
          if (typeof val === "string") {
            return val
              .split(/[,;\n•]/)
              .map((s) => s.trim())
              .filter(Boolean);
          }
          return [];
        }, z.array(z.string()).catch([])),
        url: z.string().nullable().optional().catch(null),
      })
    )
    .optional()
    .default([])
    .catch([])
    .describe("Personal, academic, or professional projects listed in the CV"),

  strengths: z.array(z.string()).catch([]),
  improvements: z.array(z.string()).catch([]),

  score: z
    .number()
    .min(0)
    .max(100)
    .catch(0)
    .describe("Overall CV rating on a 0-100 scale"),

  assessmentSummary: z
    .string()
    .catch("")
    .describe("Overall executive evaluation of this CV in Vietnamese"),
});

export type CVAnalysisResult = z.infer<typeof CVAnalysisResultSchema>;
