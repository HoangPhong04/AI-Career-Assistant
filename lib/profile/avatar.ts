export const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

export type AvatarImageType = {
  extension: "jpg" | "png" | "webp";
  contentType: "image/jpeg" | "image/png" | "image/webp";
};

export function detectAvatarImageType(bytes: Uint8Array): AvatarImageType | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { extension: "png", contentType: "image/png" };
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: "jpg", contentType: "image/jpeg" };
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { extension: "webp", contentType: "image/webp" };
  }

  return null;
}

export function getOwnedAvatarFilename(userId: string, avatarUrl: string | null) {
  const filename = avatarUrl?.match(/^\/api\/profile\/avatar\/([^/]+)$/)?.[1];
  if (!filename || !filename.startsWith(`${userId}-`)) return null;
  if (!/^[0-9a-f-]{36}-[0-9a-f-]{36}\.(?:jpg|png|webp)$/i.test(filename)) return null;
  return filename;
}
