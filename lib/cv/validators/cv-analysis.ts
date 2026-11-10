import { z } from "zod";

export const CVAnalysisResultSchema = z.object({
  isCV: z
    .boolean()
    .describe(
      "True if the document is a CV/Resume/profile. False if it is a general report, book, invoice, assignment, exam, etc."
    ),
  rejectionReason: z
    .string()
    .nullable()
    .optional()
    .describe("If isCV is false, explain why this document is not a CV."),

  personalInfo: z.object({
    fullName: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
  }),

  skills: z.object({
    technical: z
      .array(z.string())
      .describe("List of technical skills, programming languages, tools"),
    soft: z
      .array(z.string())
      .describe("List of soft skills, communication, leadership"),
  }),
  experience: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      duration: z.string().optional(),
      highlights: z
        .array(z.string())
        .describe("Key achievements or responsibilities"),
    })
  ),
  experienceLevel: z.enum(["intern", "fresher", "junior", "middle", "senior"]),

  yearsOfExperience: z.number().min(0).nullable(),

  education: z
    .array(
      z.object({
        institution: z.string(),
        degree: z.string().optional(),
        major: z.string().optional(),
        graduationYear: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string(),
        issuer: z.string(),
        year: z.string().nullable().optional(),
      })
    )
    .default([]),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      technologies: z.array(z.string()),
      url: z.string().nullable(),
    })
  ),
  strengths: z
    .array(z.string())
    .describe("Top 3-5 strongest highlights of the CV"),
  improvements: z
    .array(z.string())
    .describe("Specific, actionable areas the candidate needs to improve"),
  score: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall CV rating on a 0-100 scale"),
  assessmentSummary: z
    .string()
    .describe("Overall executive evaluation of this CV"),
});

export type CVAnalysisResult = z.infer<typeof CVAnalysisResultSchema>;
