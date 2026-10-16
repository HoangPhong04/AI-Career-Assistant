import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentUser } from "@/lib/auth";

export default async function ProtectedDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b border-neutral-200 px-6 py-3">
        <Link className="font-semibold text-neutral-900" href="/dashboard">
          AI Career Assistant
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-neutral-600 sm:inline">{user.email}</span>
          <LogoutButton />
        </div>
      </header>
      {children}
    </>
  );
}