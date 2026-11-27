-- AlterTable
ALTER TABLE "career_roadmap" ADD COLUMN     "skill_gap_json" JSONB,
ADD COLUMN     "overall_gap_score" DOUBLE PRECISION;

-- Backfill (1): the roadmap_json column used to store only the `roadmap`
-- sub-tree, so the skill-gap payload was lost on save. Rows written by the
-- seed script already carry a full `skillGap` object inside roadmap_json —
-- copy it out so the detail page can show the real score instead of the 0
-- fallback.
UPDATE "career_roadmap"
SET "skill_gap_json" = "roadmap_json"->'skillGap'
WHERE "roadmap_json" ? 'skillGap'
  AND jsonb_typeof("roadmap_json"->'skillGap') = 'object';

-- Backfill (2): rows written by the API have no `skillGap` inside
-- roadmap_json, but the skill names were still stored in `missing_skills`.
-- Rebuild a minimal gap payload from those names so the list of missing
-- skills survives. The score and the summary stay unknown — the UI shows
-- "chưa có" instead of a misleading 0.
UPDATE "career_roadmap"
SET "skill_gap_json" = jsonb_build_object(
      'targetRole', "target_role",
      'currentLevel', COALESCE("target_level", 'junior'),
      'gapSkills', (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'skill', entry,
              'category', 'technical',
              'importance', 'must-have',
              'suggestedResources', '[]'::jsonb
            )
          ),
          '[]'::jsonb
        )
        FROM jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof("missing_skills") = 'array' THEN "missing_skills"
            ELSE '[]'::jsonb
          END
        ) AS entry
      ),
      'matchedSkills', COALESCE(
        CASE
          WHEN jsonb_typeof("current_skills"->'technical') = 'array'
            THEN "current_skills"->'technical'
          ELSE '[]'::jsonb
        END,
        '[]'::jsonb
      )
    )
WHERE "skill_gap_json" IS NULL
  AND jsonb_typeof("missing_skills") = 'array'
  AND jsonb_array_length("missing_skills") > 0;

-- The gap score lives inside the JSON payload; keep a denormalized numeric
-- copy in sync so it can be filtered and sorted without JSON extraction.
UPDATE "career_roadmap"
SET "overall_gap_score" = ("skill_gap_json"->>'overallGapScore')::double precision
WHERE "skill_gap_json" IS NOT NULL
  AND "skill_gap_json"->>'overallGapScore' ~ '^[0-9]+(\.[0-9]+)?$';
