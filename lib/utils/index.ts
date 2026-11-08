import { NextResponse } from "next/server";

export function apiError(status: number, code: string, message: string) {
	return NextResponse.json(
		{ error: { code, message } },
		{ status },
	);
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
