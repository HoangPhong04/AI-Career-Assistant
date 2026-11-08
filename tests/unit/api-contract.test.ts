import assert from "node:assert/strict";
import test from "node:test";
import { apiError, apiSuccess } from "@/lib/utils";

test("API success uses the standardized data envelope", async () => {
  const response = apiSuccess({ id: "resource-1" }, 201);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { data: { id: "resource-1" } });
});

test("API error uses the standardized error envelope", async () => {
  const response = apiError(401, "UNAUTHENTICATED", "Please sign in.");
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: {
      code: "UNAUTHENTICATED",
      message: "Please sign in.",
    },
  });
});
