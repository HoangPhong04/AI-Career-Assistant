/**
 * Verify that the Career module reads skills from the `skill` ⨝ `cv_skill`
 * tables (the source written by the CV Analyzer) instead of the raw
 * `analysisJson` blob.
 *
 * Read-only — does not modify any data.
 */
import "dotenv/config";
import { resolveCvSkills, listCvsWithSkills } from "@/lib/career/skill-repository";
import { prisma } from "@/lib/prisma";

async function main() {
  const cvs = await prisma.cV.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      originalName: true,
      status: true,
      userId: true,
      analysisJson: true,
      skills: { select: { skill: { select: { name: true, category: true } } } },
    },
  });

  console.log(`\n🔍 Found ${cvs.length} CV(s) in the database.\n`);

  let tableHits = 0;
  let jsonFallbacks = 0;
  let empty = 0;

  for (const cv of cvs) {
    const resolved = await resolveCvSkills({
      id: cv.id,
      analysisJson: cv.analysisJson,
    });

    const rawTechnical =
      (cv.analysisJson as { skills?: { technical?: string[] } } | null)?.skills
        ?.technical ?? [];
    const rawSoft =
      (cv.analysisJson as { skills?: { soft?: string[] } } | null)?.skills?.soft ?? [];

    console.log(`📄 ${cv.originalName} [${cv.status}]`);
    console.log(`   cv_skill rows      : ${cv.skills.length}`);
    console.log(`   origin             : ${resolved.origin}`);
    console.log(
      `   technical          : ${resolved.skills.technical.join(", ") || "(none)"}`
    );
    console.log(`   soft               : ${resolved.skills.soft.join(", ") || "(none)"}`);
    console.log(`   analysisJson says  : ${rawTechnical.length} tech / ${rawSoft.length} soft`);

    if (resolved.origin === "skill-table") {
      tableHits++;
      // The skill table and the analysis payload should agree on content.
      const tableNames = new Set(
        [...resolved.skills.technical, ...resolved.skills.soft].map((s) =>
          s.toLowerCase()
        )
      );
      const jsonNames = new Set(
        [...rawTechnical, ...rawSoft].map((s) => s.toLowerCase())
      );
      const missing = [...jsonNames].filter((n) => !tableNames.has(n));
      if (missing.length > 0) {
        console.log(
          `   ⚠️  In analysisJson but missing from skill table: ${missing.join(", ")}`
        );
      }
    } else if (resolved.origin === "analysis-json") {
      jsonFallbacks++;
    } else {
      empty++;
    }
    console.log("");
  }

  console.log("─".repeat(60));
  console.log(`✅ skill-table source  : ${tableHits}`);
  console.log(`🔄 analysis-json fallback: ${jsonFallbacks}`);
  console.log(`⚠️  no skill data        : ${empty}`);
  console.log("─".repeat(60));

  // Verify the per-user listing used by the Career UI.
  const firstUser = await prisma.user.findFirst({
    select: { id: true, email: true },
  });
  if (firstUser) {
    const list = await listCvsWithSkills(firstUser.id);
    console.log(`\n👤 listCvsWithSkills(${firstUser.email}) → ${list.length} CV(s)`);
    for (const item of list) {
      const count = item.skills.technical.length + item.skills.soft.length;
      console.log(
        `   ${item.originalName} — ${count} kỹ năng (${item.origin}) status=${item.status}`
      );
    }
  }

  console.log("\n✨  Skill-source verification complete.");
}

main()
  .catch((e) => {
    console.error("❌  Verify failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
