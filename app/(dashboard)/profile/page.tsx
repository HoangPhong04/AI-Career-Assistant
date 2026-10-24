import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";
import { getCurrentUser } from "@/lib/auth";

export default async function ProfilePage() {
	const user = await getCurrentUser();

	if (!user) redirect("/login");

	return (
		<main className="mx-auto w-full max-w-4xl py-8 sm:py-10">
			<div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
				<p className="text-sm font-semibold text-violet-700">TÀI KHOẢN</p>
				<h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Hồ sơ cá nhân</h1>
				<p className="mt-2 text-sm text-slate-500">Quản lý thông tin tài khoản của bạn.</p>
				<ProfileForm user={user} />
			</div>
		</main>
	);
}
