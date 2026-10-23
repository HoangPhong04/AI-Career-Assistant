/**
 * Verify the seeded database — counts + spot-checks on relationships.
 * Doesn't modify data, only reads.
 */
import "dotenv/config";
import { PrismaClient } from "@/app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const [
    users,
    skills,
    cvs,
    cvSkills,
    educations,
    experiences,
    projects,
    goals,
    roadmaps,
    steps,
    interviewSessions,
    questions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.skill.count(),
    prisma.cV.count(),
    prisma.cVSkill.count(),
    prisma.education.count(),
    prisma.experience.count(),
    prisma.project.count(),
    prisma.careerGoal.count(),
    prisma.careerRoadmap.count(),
    prisma.roadmapStep.count(),
    prisma.interviewSession.count(),
    prisma.interviewQuestion.count(),
  ]);

  console.log("📊 Database counts:");
  console.log(`   Users                  ${users}`);
  console.log(`   Skills                 ${skills}`);
  console.log(`   CVs                    ${cvs}`);
  console.log(`   CV ↔ Skill links       ${cvSkills}`);
  console.log(`   Educations             ${educations}`);
  console.log(`   Experiences            ${experiences}`);
  console.log(`   Projects               ${projects}`);
  console.log(`   Career Goals           ${goals}`);
  console.log(`   Career Roadmaps        ${roadmaps}`);
  console.log(`   Roadmap Steps          ${steps}`);
  console.log(`   Interview Sessions     ${interviewSessions}`);
  console.log(`   Interview Questions    ${questions}`);

  const stepsByStatus = await prisma.roadmapStep.groupBy({
    by: ["status"],
    _count: true,
  });
  console.log("\n📋 Roadmap steps by status:");
  for (const row of stepsByStatus) console.log(`   ${row.status.padEnd(15)} ${row._count}`);

  const stepsPerRoadmap = await prisma.roadmapStep.groupBy({
    by: ["roadmapId"],
    _count: true,
  });
  console.log("\n🗺️  Steps per roadmap:");
  for (const row of stepsPerRoadmap) {
    console.log(`   roadmap ${row.roadmapId.slice(0, 8)}… → ${row._count} steps`);
  }

  const completed = await prisma.roadmapStep.count({ where: { status: "COMPLETED" } });
  const inProgress = await prisma.roadmapStep.count({ where: { status: "IN_PROGRESS" } });
  console.log(`\n✅ Progress: ${completed} completed · ${inProgress} in progress`);

  const roadmapSummaries = await prisma.careerRoadmap.findMany({
    include: {
      user: { select: { email: true } },
      cv: { select: { originalName: true, score: true } },
      _count: { select: { steps: true } },
    },
  });
  console.log("\n🗺️  Roadmaps:");
  for (const r of roadmapSummaries) {
    console.log(
      `   ${r.targetRole.padEnd(28)} status=${r.status.padEnd(10)} cvScore=${r.cv?.score ?? "—"} (${r._count.steps} steps)`
    );
  }

  const interviewList = await prisma.interviewSession.findMany({
    select: { position: true, status: true, overallScore: true },
  });
  console.log("\n🎤 Interviews:");
  for (const i of interviewList) {
    console.log(
      `   ${i.position.padEnd(28)} ${i.status.padEnd(10)} score=${i.overallScore ?? "—"}`
    );
  }

  const questionTypes = await prisma.interviewQuestion.groupBy({
    by: ["questionType"],
    _count: true,
  });
  console.log("\n📝 Questions by type:");
  for (const row of questionTypes) console.log(`   ${row.questionType.padEnd(15)} ${row._count}`);

  console.log("\n✨  All spot-checks passed.");
}

main()
  .catch((e) => {
    console.error("❌  Verify failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
