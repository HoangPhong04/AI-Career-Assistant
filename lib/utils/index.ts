import { NextResponse } from "next/server";

import { formatResetCountdown } from "@/lib/ai/quota";

export function apiError(status: number, code: string, message: string) {
	return NextResponse.json(
		{ error: { code, message } },
		{ status },
	);
}

/**
 * Build the response for a failed AI call.
 *
 * Quota / rate-limit failures are not server bugs — the request was valid but
 * the provider's daily budget is spent. They answer with 429 and carry the
 * moment the budget resets so the client can tell the user when to retry.
 *
 * Other upstream failures use 502; unavailable providers use 503.
 */
export function aiErrorResponse(
	err: unknown,
	fallbackMessage: string,
): NextResponse {
	const code =
		err instanceof Error
			? (err as { code?: string }).code ?? "AI_ERROR"
			: "AI_ERROR";

	if (code === "AI_QUOTA_EXCEEDED") {
		const resetsAt = (err as { resetsAt?: number }).resetsAt;
		const countdown = formatResetCountdown(resetsAt);
		const message = countdown
			? `${(err as Error).message} ${countdown}`
			: (err as Error).message || fallbackMessage;

		return NextResponse.json(
			{ error: { code, message, resetsAt } },
			{ status: 429 },
		);
	}

	if (code === "AI_UNAVAILABLE" || code === "API_KEY_MISSING") {
		return apiError(
			503,
			code,
			(err as Error).message || fallbackMessage,
		);
	}

	if (code === "AI_REQUEST_FAILED" || code === "INVALID_RESPONSE_SCHEMA") {
		return apiError(
			502,
			code,
			(err as Error).message || fallbackMessage,
		);
	}

	return apiError(500, code, (err as Error).message ?? fallbackMessage);
}

export function apiSuccess<T>(
	data: T,
	init?: ResponseInit | number,
) {
	return NextResponse.json(
		{ data },
		typeof init === "number" ? { status: init } : init,
	);
}

export function isUniqueConstraintError(error: unknown) {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "P2002"
	);
}
