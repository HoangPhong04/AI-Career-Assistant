ALTER TABLE "interview_questions"
ADD COLUMN "order_index" INTEGER NOT NULL DEFAULT 0;

WITH ranked_questions AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "session_id"
      ORDER BY "created_at", "id"
    ) - 1 AS "order_index"
  FROM "interview_questions"
)
UPDATE "interview_questions" AS question
SET "order_index" = ranked_questions."order_index"
FROM ranked_questions
WHERE question."id" = ranked_questions."id";
