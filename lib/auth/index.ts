import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "aca_session";
const SESSION_ISSUER = "ai-career-assistant";
const SESSION_AUDIENCE = "ai-career-assistant";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const publicUserSelect = {
	id: true,
	email: true,
	fullName: true,
	role: true,
	avatarUrl: true,
	createdAt: true,
	updatedAt: true,
} as const;

export type PublicUser = {
	id: string;
	email: string;
	fullName: string | null;
	role: string;
	avatarUrl: string | null;
	createdAt: Date;
	updatedAt: Date;
};

function getSessionSecret() {
	const secret = process.env.AUTH_SECRET;

	if (!secret || new TextEncoder().encode(secret).length < 32) {
		throw new Error("AUTH_SECRET must contain at least 32 characters");
	}

	return new TextEncoder().encode(secret);
}

export function hashPassword(password: string) {
	return hash(password, 12);
}

export function verifyPassword(password: string, passwordHash: string) {
	return compare(password, passwordHash);
}

export function createSessionToken(userId: string) {
	return new SignJWT({})
		.setProtectedHeader({ alg: "HS256" })
		.setSubject(userId)
		.setIssuer(SESSION_ISSUER)
		.setAudience(SESSION_AUDIENCE)
		.setIssuedAt()
		.setExpirationTime(`${SESSION_MAX_AGE}s`)
		.sign(getSessionSecret());
}

export async function setSessionCookie(token: string) {
	const cookieStore = await cookies();

	cookieStore.set(COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: SESSION_MAX_AGE,
	});
}

export async function clearSessionCookie() {
	const cookieStore = await cookies();

	cookieStore.set(COOKIE_NAME, "", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 0,
	});
}

export async function getCurrentUser(): Promise<PublicUser | null> {
	const cookieStore = await cookies();
	const token = cookieStore.get(COOKIE_NAME)?.value;

	if (!token) return null;

	let userId: string;
	try {
		const { payload } = await jwtVerify(token, getSessionSecret(), {
			algorithms: ["HS256"],
			issuer: SESSION_ISSUER,
			audience: SESSION_AUDIENCE,
		});

		if (!payload.sub) return null;
		userId = payload.sub;
	} catch {
		return null;
	}

	return prisma.user.findUnique({
		where: { id: userId },
		select: publicUserSelect,
	});
}
