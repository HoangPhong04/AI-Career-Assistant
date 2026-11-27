/**
 * Backfill `roadmap_step.addresses_skill` for roadmaps created before the
 * link between a step and the gap skill it closes existed.
 *
 * The AI did not provide the link back then, so the best we can do is match
 * a step title to a gap skill by keyword. Steps that cannot be matched keep
 * a NULL link — the UI then reports them as "not tied to a skill" instead of
 * silently claiming progress.
 *
 * Run with:  npx tsx --env-file=.env scripts/backfill-addresses-skill.ts
 */

import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { resolveAddressedSkill } from "@/lib/career/progress";

/** Words that carry the meaning of a skill name. */
const STOP_WORDS = new Set([
  // Vietnamese function words
  "và",
  "của",
  "cho",
  "với",
  "các",
  "những",
  "trong",
  "theo",
  "một",
  "nâng",
  "cao",
  "cơ",
  "bản",
  "phát",
  "triển",
  "chuyên",
  "sâu",
  "lập",
  "trình",
  "ứng",
  "dụng",
  "thực",
  "hành",
  "xây",
  "dựng",
  "thiết",
  "kế",
  "quản",
  "lý",
  "hiệu",
  "chức",
  "năng",
  "kiến",
  "thức",
  "cơ",
  "bản",
  // Generic domain words that appear in many skills at once — matching on
  // them links unrelated steps to each other.
  "nhúng",
  "thống",
  "phần",
  "thử",
  "kiểm",
  "mềm",
  "tiên",
  "đại",
  "chuyên",
]);

/**
 * The technology terms a gap skill is about.
 *
 * Only the parts of the skill name that name a concrete technology count —
 * "Lập trình C/C++ nâng cao cho Hệ thống nhúng" is about `c/c++`, not
 * about "lập trình" or "hệ thống nhúng".
 *
 * A term is kept as a whole: "c/c++" and "node.js" are single technologies,
 * not the words "c" and "node".
 */
function techTerms(skill: string): string[] {
  return skill
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    // Keep the slash-joined and dot-joined forms together: "c/c++", "node.js".
    .replace(/([\p{L}\p{N}+#]+)\/([\p{L}\p{N}+#]+)/gu, "$1/$2")
    .split(/[\s,&+]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3 && !STOP_WORDS.has(part));
}

/**
 * Score a match that requires a shared technology term.
 *
 * Returns 0 when the two share no technology term — a generic word overlap
 * is not enough to link a step to a skill.
 */
function techMatchScore(title: string, skill: string): number {
  const titleTerms = new Set(techTerms(title));
  const skillTerms = techTerms(skill);
  if (skillTerms.length === 0) return 0;

  let best = 0;
  for (const term of skillTerms) {
    if (!titleTerms.has(term)) continue;
    best = Math.max(best, term.length >= 6 ? 3 : 2);
  }
  return best;
}

async function main() {
  const roadmaps = await prisma.careerRoadmap.findMany({
    select: {
      id: true,
      targetRole: true,
      skillGapJson: true,
      steps: {
        select: { id: true, title: true, addressesSkill: true },
      },
    },
  });

  let linked = 0;
  let alreadyLinked = 0;
  let unmatched = 0;

  for (const roadmap of roadmaps) {
    const skillGap = (roadmap.skillGapJson ?? {}) as { gapSkills?: { skill: string }[] };
    const gapSkills = (skillGap.gapSkills ?? []).map((g) => g.skill);
    if (gapSkills.length === 0) continue;

    for (const step of roadmap.steps) {
      if (step.addressesSkill) {
        alreadyLinked++;
        continue;
      }

      // First try the strict resolver — it handles the exact-name case and
      // the "Title (details)" headline form.
      const exact = resolveAddressedSkill(step.title, gapSkills);
      if (exact) {
        await prisma.roadmapStep.update({
          where: { id: step.id },
          data: { addressesSkill: exact },
        });
        linked++;
        console.log(`  linked (exact)  "${step.title}" -> ${exact}`);
        continue;
      }

      // Otherwise pick the gap skill with the strongest technology overlap.
      // A shared technology term is required — a generic word overlap is
      // not enough to claim a step closes a skill.
      let best: { skill: string; score: number } | null = null;
      for (const skill of gapSkills) {
        const score = techMatchScore(step.title, skill);
        if (score > 0 && (!best || score > best.score)) {
          best = { skill, score };
        }
      }

      // A tie means two skills match equally well — that is a guess, so the
      // step stays unlinked rather than counting towards the wrong skill.
      if (best && best.score >= 2) {
        const contenders = gapSkills.filter(
          (skill) => techMatchScore(step.title, skill) === best!.score
        );
        if (contenders.length > 1) {
          unmatched++;
          console.log(`  skipped (tie)   "${step.title}"`);
          continue;
        }
        await prisma.roadmapStep.update({
          where: { id: step.id },
          data: { addressesSkill: best.skill },
        });
        linked++;
        console.log(`  linked (fuzzy)  "${step.title}" -> ${best.skill}`);
      } else {
        unmatched++;
      }
    }
  }

  console.log(
    `\nDone. linked=${linked} alreadyLinked=${alreadyLinked} unmatched=${unmatched}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
