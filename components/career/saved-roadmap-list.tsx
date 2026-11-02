import Link from "next/link";

type SavedRoadmap = {
  id: string;
  targetRole: string;
  targetLevel: string | null;
  status: string;
  totalSteps: number;
  updatedAt: string;
};

type SavedRoadmapListProps = {
  roadmaps: SavedRoadmap[];
};

export function SavedRoadmapList({ roadmaps }: SavedRoadmapListProps) {
  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
        Lộ trình đã lưu
      </h2>

      {roadmaps.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-500">
          Chưa có lộ trình nào. Tạo roadmap đầu tiên để bắt đầu theo dõi tiến độ.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {roadmaps.map((roadmap) => (
            <li key={roadmap.id}>
              <Link
                className="block rounded-lg border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-emerald-500 hover:bg-emerald-50/40"
                href={`/career/${roadmap.id}`}
              >
                <p className="truncate text-sm font-medium text-neutral-900">
                  {roadmap.targetRole}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {roadmap.targetLevel ?? "—"} · {roadmap.totalSteps} nhiệm vụ · {roadmap.status}
                </p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  Cập nhật {new Date(roadmap.updatedAt).toLocaleDateString("vi-VN")}
                </p>
                <p className="mt-2 text-xs font-medium text-emerald-800">
                  Xem chi tiết →
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
