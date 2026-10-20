import { NextResponse } from "next/server";

export function apiError(status: number, code: string, message: string) {
	return NextResponse.json(
		{ error: { code, message } },
		{ status },
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
