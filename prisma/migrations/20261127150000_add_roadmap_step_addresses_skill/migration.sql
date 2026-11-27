-- AlterTable
ALTER TABLE "roadmap_step" ADD COLUMN     "addresses_skill" VARCHAR(200);

-- The link between a step and the gap skill it closes is new: the AI did not
-- provide it before, so existing steps keep a NULL `addresses_skill`. The
-- backfill script (`scripts/backfill-addresses-skill.ts`) matches step titles
-- to gap skills by keyword and fills in what it can.
