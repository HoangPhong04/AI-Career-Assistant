import { LogoutButton } from "@/components/auth/logout-button";
import { ProfileForm } from "@/components/profile/profile-form";
import { getCurrentUser } from "@/lib/auth";

export default async function ProfilePage() {
	const user = await getCurrentUser();

	if (!user) return null;

	return (
		<main className="mx-auto w-full max-w-4xl px-6 py-10">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold text-neutral-950">Hồ sơ cá nhân</h1>
					<p className="mt-2 text-sm text-neutral-600">Quản lý thông tin tài khoản của bạn.</p>
				</div>
				<LogoutButton />
			</div>
			<ProfileForm user={user} />
		</main>
	);
}
