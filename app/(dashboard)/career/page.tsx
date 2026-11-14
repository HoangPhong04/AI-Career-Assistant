import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CareerForm } from "@/components/career/career-form";
import { SavedRoadmapList } from "@/components/career/saved-roadmap-list";

export default async function CareerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const savedRoadmaps = await prisma.careerRoadmap.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      targetRole: true,
      targetLevel: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { steps: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <CareerForm />
        </section>
        <SavedRoadmapList
          roadmaps={savedRoadmaps.map((r) => ({
            id: r.id,
            targetRole: r.targetRole,
            targetLevel: r.targetLevel,
            status: r.status,
            totalSteps: r._count.steps,
            updatedAt: r.updatedAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}