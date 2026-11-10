import assert from "node:assert/strict";
import test from "node:test";
import {
  detectAvatarImageType,
  getOwnedAvatarFilename,
  MAX_AVATAR_SIZE,
} from "@/lib/profile/avatar";
import { changePasswordSchema } from "@/lib/validators";

test("avatar validation detects PNG, JPEG, and WebP from file signatures", () => {
  assert.deepEqual(
    detectAvatarImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    { extension: "png", contentType: "image/png" },
  );
  assert.deepEqual(
    detectAvatarImageType(Uint8Array.from([0xff, 0xd8, 0xff])),
    { extension: "jpg", contentType: "image/jpeg" },
  );
  assert.deepEqual(
    detectAvatarImageType(Uint8Array.from([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ])),
    { extension: "webp", contentType: "image/webp" },
  );
  assert.equal(detectAvatarImageType(Uint8Array.from([1, 2, 3])), null);
});

test("avatar filenames must be valid and belong to the authenticated user", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const filename = `${userId}-22222222-2222-4222-8222-222222222222.png`;

  assert.equal(getOwnedAvatarFilename(userId, `/api/profile/avatar/${filename}`), filename);
  assert.equal(getOwnedAvatarFilename(userId, `/api/profile/avatar/${filename}.txt`), null);
  assert.equal(getOwnedAvatarFilename(userId, `/api/profile/avatar/../${filename}`), null);
  assert.equal(
    getOwnedAvatarFilename("33333333-3333-4333-8333-333333333333", `/api/profile/avatar/${filename}`),
    null,
  );
  assert.equal(MAX_AVATAR_SIZE, 2 * 1024 * 1024);
});

test("password change requires a matching confirmation and a different password", () => {
  assert.equal(changePasswordSchema.safeParse({
    currentPassword: "old-password",
    newPassword: "new-password",
    confirmPassword: "new-password",
  }).success, true);
  assert.equal(changePasswordSchema.safeParse({
    currentPassword: "old-password",
    newPassword: "new-password",
    confirmPassword: "other-password",
  }).success, false);
  assert.equal(changePasswordSchema.safeParse({
    currentPassword: "old-password",
    newPassword: "old-password",
    confirmPassword: "old-password",
  }).success, false);
});
