import { NextResponse } from "next/server";
import { createSessionToken, hashPassword, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, isUniqueConstraintError } from "@/lib/utils";
import { registerSchema } from "@/lib/validators";

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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Please check the submitted fields");
  }

  try {
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        fullName: parsed.data.fullName,
      },
      select: publicUserSelect,
    });

    await setSessionCookie(await createSessionToken(user.id));
    return NextResponse.json({ data: { user } }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return apiError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
    }

    return apiError(500, "INTERNAL_ERROR", "Unable to create the account");
  }
}