/**
 * AI provider abstraction — single entry point for all AI calls.
 * Currently uses OpenAI SDK with Gemini-compatible baseURL.
 * Swap the client or baseURL here to switch provider.
 */
import OpenAI from "openai";

/** Shared error class for all AI operations. */
export class AIAnalysisError extends Error {
  constructor(
    message: string,
    public code:
      | "API_KEY_MISSING"
      | "RATE_LIMITED"
      | "AI_UNAVAILABLE"
      | "AI_REQUEST_FAILED"
      | "INVALID_RESPONSE_SCHEMA"
  ) {
    super(message);
    this.name = "AIAnalysisError";
  }
}

export class AICareerError extends Error {
  constructor(
    message: string,
    public code:
      | "API_KEY_MISSING"
      | "AI_REQUEST_FAILED"
      | "INVALID_RESPONSE_SCHEMA"
      | "CONTENT_TOO_LONG"
  ) {
    super(message);
    this.name = "AICareerError";
  }
}

/** Shared AI client — lazily initialized so importing this module (e.g. in
 *  unit tests or build steps) does not require a live API key. */
let _aiClient: OpenAI | null = null;

function getAiClient(): OpenAI {
  if (!_aiClient) {
    _aiClient = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY ?? "",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      maxRetries: 0,
      timeout: 45_000,
    });
  }
  return _aiClient;
}

export function normalizeAIRequestError(error: unknown): AIAnalysisError {
  const message = error instanceof Error ? error.message : String(error);
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : undefined;

  if (
    status === 429 ||
    /\bRESOURCE_EXHAUSTED\b|quota exceeded|rate limit/i.test(message)
  ) {
    return new AIAnalysisError(
      "Hạn mức sử dụng Gemini đã đạt giới hạn. Hãy kiểm tra hạn mức và gói thanh toán, hoặc đợi đến khi hạn mức được đặt lại rồi thử lại.",
      "RATE_LIMITED"
    );
  }

  if (
    status === 503 ||
    /\bUNAVAILABLE\b|high demand|temporarily unavailable/i.test(message)
  ) {
    return new AIAnalysisError(
      "Dịch vụ Gemini hiện đang quá tải hoặc tạm thời không khả dụng. Vui lòng đợi một lúc rồi thử lại.",
      "AI_UNAVAILABLE"
    );
  }

  return new AIAnalysisError(`AI request failed: ${message}`, "AI_REQUEST_FAILED");
}

/**
 * Generic AI call wrapper with shared error handling.
 * Returns the raw text content from the assistant message.
 */
export async function aiChatCompletion({
  model,
  systemPrompt,
  userMessage,
  temperature = 0.3,
  maxTokens,
}: {
  model?: string;
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const resolvedModel = model ?? process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

  if (!process.env.GEMINI_API_KEY) {
    throw new AIAnalysisError(
      "GEMINI_API_KEY is not configured.",
      "API_KEY_MISSING"
    );
  }

  try {
    const res = await getAiClient().chat.completions.create({
      model: resolvedModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    });

    return res.choices[0]?.message?.content ?? "";
  } catch (err: unknown) {
    throw normalizeAIRequestError(err);
  }
}

/** Strip markdown code fences that some models return. */
export function stripJsonFence(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/**
 * Internal helpers exposed as a plain object so unit tests can override
 * individual entries via `t.mock.method(aiInternals, 'name', impl)`.
 * Production callers should keep using `aiChatCompletion`.
 */
export const aiInternals = {
  async chatCompletion(
    params: Parameters<typeof aiChatCompletion>[0]
  ): Promise<string> {
    return aiChatCompletion(params);
  },
};
