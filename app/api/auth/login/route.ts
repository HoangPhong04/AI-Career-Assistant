import { NextResponse } from "next/server";
import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import { loginSchema } from "@/lib/validators";

const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Please check the submitted fields");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { ...publicUserSelect, passwordHash: true },
    });

    if (
      !user ||
      !user.passwordHash ||
      !(await verifyPassword(parsed.data.password, user.passwordHash))
    ) {
      return apiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    await setSessionCookie(await createSessionToken(user.id));
    return NextResponse.json({ data: { user: safeUser } });
  } catch {
    return apiError(500, "INTERNAL_ERROR", "Unable to sign in right now");
  }
}