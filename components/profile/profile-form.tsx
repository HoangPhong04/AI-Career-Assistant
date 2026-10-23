"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { PublicUser } from "@/lib/auth";

type ProfileFormProps = {
  user: PublicUser;
};

type ApiResponse = {
  error?: { message?: string };
};

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(user.fullName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
        }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(result.error?.message ?? "Không thể cập nhật hồ sơ.");
        return;
      }

      setMessage("Đã lưu thay đổi.");
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8 max-w-xl space-y-5" onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-neutral-800">
        Email
        <input
          className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
          readOnly
          value={user.email}
        />
      </label>

      <label className="block text-sm font-medium text-neutral-800">
        Họ và tên
        <input
          autoComplete="name"
          className="mt-2 block w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          maxLength={100}
          onChange={(event) => setFullName(event.target.value)}
          required
          value={fullName}
        />
      </label>

      <label className="block text-sm font-medium text-neutral-800">
        Avatar URL
        <input
          className="mt-2 block w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          maxLength={255}
          onChange={(event) => setAvatarUrl(event.target.value)}
          type="url"
          value={avatarUrl}
        />
      </label>

      {message && <p className="text-sm text-emerald-800" role="status">{message}</p>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

      <button
        className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Đang lưu..." : "Lưu hồ sơ"}
      </button>
    </form>
  );
}