import {
  CVAnalysisResultSchema,
  type CVAnalysisResult,
} from "@/lib/cv/validators/cv-analysis";
import OpenAI from "openai";

export class AIAnalysisError extends Error {
  constructor(
    message: string,
    public code:
      | "API_KEY_MISSING"
      | "AI_REQUEST_FAILED"
      | "INVALID_RESPONSE_SCHEMA"
  ) {
    super(message);
    this.name = "AIAnalysisError";
  }
}
const aiClient = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  maxRetries: 3,
  timeout: 45000,
});

const CV_ANALYSIS_SYSTEM_PROMPT = `
    You are an expert HR Specialist and Technical Recruiter.
    Analyze the candidate's CV text and respond STRICTLY with a valid JSON object matching this exact template:
 You are an expert HR Specialist and Technical Recruiter.
    Your first task is to determine whether the provided document is actually a Curriculum Vitae (CV) / Resume of an
  individual.

    Respond STRICTLY with a valid JSON object matching this exact template:

    {
      "isCV": true,
      "rejectionReason": null,
      "personalInfo": {
        "fullName": "Candidate full name or null",
        "email": "email or null",
        "phone": "phone or null",
        "summary": "Brief 1-2 sentence profile summary or null"
      },
      "skills": {
        "technical": ["React", "Node.js", "..."],
        "soft": ["Communication", "Teamwork", "..."]
      },
      "experience": [
        {
          "company": "Company Name",
          "role": "Job Title",
          "duration": "e.g. 2022 - 2024",
          "highlights": ["Key achievement 1", "Key achievement 2"]
        }
      ],
      "education": [
        {
          "institution": "University name",
          "degree": "e.g. Bachelor",
          "major": "e.g. Information Technology",
          "graduationYear": "e.g. 2023"
        }
      ],
      "strengths": ["Top highlight 1", "Top highlight 2"],
      "improvements": ["Specific improvement 1", "Specific improvement 2"],
      "score": 85,
      "assessmentSummary": "Overall evaluation of this candidate's profile."
    }

    Special Guardrail Rules:
    - If the document is NOT a CV/resume (e.g. it is a research paper, book, invoice, project report, exam paper,
  random code, legal contract):
      Set "isCV": false
      Set "rejectionReason": "Brief explanation why this document is not recognized as a resume (in Vietnamese, e.g.:
  'Tài liệu được tải lên là báo cáo dự án/sách, không có thông tin hồ sơ ứng viên.')."
      Set "score": 0
      Set empty arrays [] for skills, experience, education, strengths, improvements.
    `;

export async function analyzeCVWithAI(
  extractedText: string
): Promise<CVAnalysisResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new AIAnalysisError(
      "OPENAI_API_KEY is not configured in the environment.",
      "API_KEY_MISSING"
    );
  }
  let rawResponse = "";
  try {
    const res = await aiClient.chat.completions.create({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      messages: [
        { role: "system", content: CV_ANALYSIS_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Here is the candidate's extracted CV text:\n\n"""\n${extractedText}\n"""\n\nAnalyze this resume and provide the structured JSON
    result.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Giữ độ nhất quán cao
    });

    rawResponse = res.choices[0]?.message?.content || "";
  } catch (err: unknown) {
    throw new AIAnalysisError(
      `Gemini request failed: ${(err as Error).message}`,
      "AI_REQUEST_FAILED"
    );
  }
  try {
    const cleanedJson = rawResponse
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsedJson = JSON.parse(cleanedJson);
    return CVAnalysisResultSchema.parse(parsedJson);
  } catch (err: unknown) {
    console.error("--- RAW AI RESPONSE ---", rawResponse);
    console.error("--- PARSE / ZOD ERROR ---", err);
    throw new AIAnalysisError(
      "AI response did not adhere to the required JSON schema.",
      "INVALID_RESPONSE_SCHEMA"
    );
  }
}
