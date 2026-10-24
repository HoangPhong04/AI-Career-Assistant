import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { DashboardNavigation } from "@/components/layout/dashboard-navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function ProtectedDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
          <Link className="flex shrink-0 items-center gap-2 font-bold tracking-tight text-slate-950" href="/dashboard">
            <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path d="M8 8V5m8 3V5M5 10h14v9H5z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                <path d="M9 14h.01M15 14h.01M9 17h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
              </svg>
            </span>
            <span className="hidden sm:inline">AI Career Assistant</span>
            <span className="sm:hidden">AI Career</span>
          </Link>
          <DashboardNavigation />
          <div className="flex shrink-0 items-center gap-3 border-l border-slate-200 pl-3">
            <span className="hidden max-w-40 truncate text-sm text-slate-500 lg:inline" title={user.email}>
              {user.fullName || user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}