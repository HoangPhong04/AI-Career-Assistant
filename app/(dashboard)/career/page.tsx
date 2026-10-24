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
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-neutral-950">Career Roadmap</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Phân tích khoảng cách kỹ năng và theo dõi lộ trình phát triển sự nghiệp của bạn.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <CareerForm />
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