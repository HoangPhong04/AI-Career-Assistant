import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SavedRoadmapDetail } from "@/components/career/saved-roadmap-detail";
import {
  CareerAnalyzeResultSchema,
  normalizeRoadmapResponse,
} from "@/lib/career";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CAREER_LEVELS = ["fresher", "junior", "mid", "senior", "lead"] as const;

export default async function SavedCareerRoadmapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const roadmap = await prisma.careerRoadmap.findFirst({
    where: { id, userId: user.id },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });

  if (!roadmap) notFound();

  const currentLevel =
    CAREER_LEVELS.find((level) => level === roadmap.targetLevel) ?? "junior";
  const parsed = CareerAnalyzeResultSchema.safeParse(
    normalizeRoadmapResponse(roadmap.roadmapJson, {
      targetRole: roadmap.targetRole,
      currentLevel,
    }, {
      missingSkills: roadmap.missingSkills,
    })
  );
  if (!parsed.success) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <Link className="text-sm text-emerald-800 hover:underline" href="/career">
          ← Quay lại lộ trình nghề nghiệp
        </Link>
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          Lộ trình này không còn đúng cấu trúc dữ liệu và không thể hiển thị chi tiết.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <Link className="text-sm text-emerald-800 hover:underline" href="/career">
        ← Quay lại lộ trình nghề nghiệp
      </Link>
      <SavedRoadmapDetail
        roadmap={parsed.data}
        steps={roadmap.steps.map((step) => ({
          id: step.id,
          status: step.status,
          orderIndex: step.orderIndex,
        }))}
      />
    </main>
  );
}
