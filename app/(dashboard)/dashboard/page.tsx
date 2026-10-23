import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const features = [
	{
		href: "/cv",
		number: "01",
		title: "Phân tích CV",
		description: "Khám phá điểm mạnh và kỹ năng nổi bật trong hồ sơ của bạn.",
	},
	{
		href: "/career",
		number: "02",
		title: "Lộ trình nghề nghiệp",
		description: "Xác định kỹ năng cần bổ sung để tiến gần hơn tới mục tiêu.",
	},
	{
		href: "/interview",
		number: "03",
		title: "Phỏng vấn AI",
		description: "Luyện tập phỏng vấn và chuẩn bị tự tin cho cơ hội tiếp theo.",
	},
] as const;

export default async function DashboardPage() {
	const user = await getCurrentUser();
	if (!user) redirect("/login");

	return (
		<main className="py-8 sm:py-10">
			<section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#17183f] via-[#211a52] to-violet-800 p-6 text-white shadow-lg shadow-violet-950/10 sm:p-10">
				<p className="text-sm font-semibold text-violet-200">KHÔNG GIAN PHÁT TRIỂN CỦA BẠN</p>
				<h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
					Chào mừng{user.fullName ? `, ${user.fullName}` : " bạn"}!
				</h1>
				<p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100/80 sm:text-base">
					Mỗi bước nhỏ hôm nay đưa bạn đến gần hơn với công việc mơ ước. Bạn muốn bắt đầu từ đâu?
				</p>
				<Link
					className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-violet-800 transition hover:bg-violet-50"
					href="/cv"
				>
					Bắt đầu với CV
					<span aria-hidden="true">→</span>
				</Link>
			</section>

			<section className="mt-8">
				<div className="mb-4">
					<h2 className="text-lg font-bold text-slate-950">Công cụ của bạn</h2>
					<p className="mt-1 text-sm text-slate-500">Chọn một tính năng để tiếp tục hành trình.</p>
				</div>
				<div className="grid gap-4 md:grid-cols-3">
					{features.map((feature) => (
						<Link
							className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
							href={feature.href}
							key={feature.href}
						>
							<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-sm font-bold text-violet-700">
								{feature.number}
							</span>
							<h3 className="mt-4 font-semibold text-slate-900 group-hover:text-violet-700">{feature.title}</h3>
							<p className="mt-2 text-sm leading-6 text-slate-500">{feature.description}</p>
							<span className="mt-4 inline-block text-sm font-semibold text-violet-700">Khám phá →</span>
						</Link>
					))}
				</div>
			</section>
		</main>
	);
}
