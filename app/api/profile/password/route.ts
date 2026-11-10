import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { changePasswordSchema } from "@/lib/validators";

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return apiError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid password.");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { passwordHash: true },
    });
    if (!user) {
      return apiError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    }
    if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      return apiError(400, "CURRENT_PASSWORD_INCORRECT", "Mật khẩu hiện tại không chính xác.");
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
      select: { id: true },
    });

    return apiSuccess({ changed: true });
  } catch (error) {
    console.error("[profile/password] Failed to change password:", error);
    return apiError(500, "PASSWORD_CHANGE_FAILED", "Không thể thay đổi mật khẩu lúc này.");
  }
}
