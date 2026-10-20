import { ApiTestPanel } from "@/components/dashboard/api-test-panel";

export default function DashboardPage() {
	return (
		<main className="mx-auto w-full max-w-6xl px-6 py-10">
			<h1 className="text-2xl font-semibold text-neutral-950">Dashboard</h1>
			<ApiTestPanel />
		</main>
	);
}
