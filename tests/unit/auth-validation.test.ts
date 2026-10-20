import assert from "node:assert/strict";
import test from "node:test";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "@/lib/validators";

test("login trims and normalizes email", () => {
  assert.deepEqual(loginSchema.parse({
    email: "  LEARNER@EXAMPLE.COM ",
    password: "valid-password",
  }), {
    email: "learner@example.com",
    password: "valid-password",
  });
});

test("registration rejects short passwords", () => {
  assert.equal(registerSchema.safeParse({
    email: "learner@example.com",
    password: "short",
  }).success, false);
});

test("registration rejects passwords beyond bcrypt's UTF-8 byte limit", () => {
  assert.equal(registerSchema.safeParse({
    email: "learner@example.com",
    password: "a".repeat(73),
  }).success, false);
});

test("profile update rejects fields outside the allowlist", () => {
  assert.equal(updateProfileSchema.safeParse({ role: "ADMIN" }).success, false);
});

test("profile update requires at least one valid field", () => {
  assert.equal(updateProfileSchema.safeParse({}).success, false);
  assert.deepEqual(updateProfileSchema.parse({ fullName: null }), { fullName: null });
});

test("registration accepts an omitted optional full name", () => {
  assert.equal(registerSchema.safeParse({
    email: "learner@example.com",
    password: "valid-password",
  }).success, true);
});