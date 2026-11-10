import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { detectAvatarImageType, getOwnedAvatarFilename, MAX_AVATAR_SIZE } from "@/lib/profile/avatar";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

export const runtime = "nodejs";

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
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return apiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để tiếp tục.");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError(400, "INVALID_FORM_DATA", "Không đọc được ảnh tải lên.");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return apiError(400, "INVALID_FILE", "Vui lòng chọn ảnh đại diện.");
  }
  if (file.size === 0 || file.size > MAX_AVATAR_SIZE) {
    return apiError(413, "AVATAR_SIZE_INVALID", "Ảnh đại diện phải lớn hơn 0 và không vượt quá 2 MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const imageType = detectAvatarImageType(bytes);
  if (!imageType || file.type !== imageType.contentType) {
    return apiError(415, "AVATAR_TYPE_INVALID", "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP hợp lệ.");
  }

  const filename = `${currentUser.id}-${randomUUID()}.${imageType.extension}`;
  const storageDirectory = path.join(process.cwd(), "storage", "avatars");
  const absolutePath = path.join(storageDirectory, filename);
  const avatarUrl = `/api/profile/avatar/${filename}`;

  try {
    await mkdir(storageDirectory, { recursive: true });
    await writeFile(absolutePath, bytes, { flag: "wx" });

    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: { avatarUrl },
      select: publicUserSelect,
    });

    const previousFilename = getOwnedAvatarFilename(currentUser.id, currentUser.avatarUrl);
    if (previousFilename && previousFilename !== filename) {
      try {
        await unlink(path.join(storageDirectory, previousFilename));
      } catch (error) {
        console.error("[profile/avatar] Failed to remove previous avatar:", error);
      }
    }

    return apiSuccess({ user: updatedUser });
  } catch (error) {
    console.error("[profile/avatar] Failed to save avatar:", error);
    try {
      await unlink(absolutePath);
    } catch (cleanupError) {
      if ((cleanupError as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("[profile/avatar] Failed to clean up uploaded avatar:", cleanupError);
      }
    }
    return apiError(500, "AVATAR_UPLOAD_FAILED", "Không thể lưu ảnh đại diện lúc này.");
  }
}
