"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setError("Không thể đăng xuất. Vui lòng thử lại.");
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ để đăng xuất.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className="whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-wait disabled:opacity-60"
        disabled={isSubmitting}
        onClick={handleLogout}
        type="button"
      >
        {isSubmitting ? "Đang đăng xuất..." : "Đăng xuất"}
      </button>
      {error && <span className="max-w-48 text-right text-xs text-red-700" role="alert">{error}</span>}
    </div>
  );
}