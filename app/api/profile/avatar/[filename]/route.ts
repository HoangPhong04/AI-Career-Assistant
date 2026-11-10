import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedAvatarFilename } from "@/lib/profile/avatar";
import { apiError } from "@/lib/utils";

const contentTypeByExtension = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để xem ảnh.");
  }

  const { filename } = await params;
  if (getOwnedAvatarFilename(user.id, user.avatarUrl) !== filename) {
    return apiError(404, "AVATAR_NOT_FOUND", "Không tìm thấy ảnh đại diện.");
  }

  const extension = filename.split(".").at(-1) as keyof typeof contentTypeByExtension;
  try {
    const image = await readFile(path.join(process.cwd(), "storage", "avatars", filename));
    return new Response(new Uint8Array(image), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Length": String(image.byteLength),
        "Content-Type": contentTypeByExtension[extension],
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return apiError(404, "AVATAR_NOT_FOUND", "Không tìm thấy ảnh đại diện.");
    }
    console.error("[profile/avatar] Failed to read avatar:", error);
    return apiError(500, "AVATAR_READ_FAILED", "Không thể tải ảnh đại diện.");
  }
}
