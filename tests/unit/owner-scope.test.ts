import assert from "node:assert/strict";
import test from "node:test";
import { belongsToUser } from "@/lib/access-control";

test("owner scope accepts only matching resource ownership", () => {
  assert.equal(belongsToUser({ userId: "user-1" }, "user-1"), true);
  assert.equal(belongsToUser({ userId: "user-2" }, "user-1"), false);
  assert.equal(belongsToUser(null, "user-1"), false);
  assert.equal(belongsToUser(undefined, "user-1"), false);
});
