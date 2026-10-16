import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import { updateProfileSchema } from "@/lib/validators";

const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "Please sign in to continue");

  return NextResponse.json({ data: { user } });
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return apiError(401, "UNAUTHENTICATED", "Please sign in to continue");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON");
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Please check the submitted fields");
  }

  try {
    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: parsed.data,
      select: publicUserSelect,
    });

    return NextResponse.json({ data: { user } });
  } catch {
    return apiError(500, "INTERNAL_ERROR", "Unable to update the profile");
  }
}