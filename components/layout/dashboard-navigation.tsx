"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/cv", label: "Phân tích CV" },
  { href: "/career", label: "Lộ trình nghề nghiệp" },
  { href: "/interview", label: "Phỏng vấn AI" },
  { href: "/profile", label: "Hồ sơ" },
] as const;

export function DashboardNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Điều hướng chính" className="min-w-0 flex-1 overflow-x-auto">
      <ul className="flex min-w-max items-center gap-1">
        {items.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`block rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-violet-50 text-violet-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
                href={item.href}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
