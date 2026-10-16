"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type AuthFormProps = {
  mode: "login" | "register";
};

type ApiResponse = {
  error?: { message?: string };
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const body = Object.fromEntries(formData.entries()) as Record<string, string>;
    if (isRegister && !body.fullName.trim()) delete body.fullName;

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(result.error?.message ?? "Đã xảy ra lỗi. Vui lòng thử lại.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
      <section className="w-full">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
          AI Career Assistant
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-neutral-950">
          {isRegister ? "Tạo tài khoản" : "Đăng nhập"}
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          {isRegister
            ? "Bắt đầu xây dựng lộ trình nghề nghiệp của bạn."
            : "Đăng nhập để tiếp tục với hồ sơ nghề nghiệp của bạn."}
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {isRegister && (
            <label className="block text-sm font-medium text-neutral-800">
              Họ và tên
              <input
                autoComplete="name"
                className="mt-2 block w-full rounded border border-neutral-300 px-3 py-2.5 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                maxLength={100}
                name="fullName"
                type="text"
              />
            </label>
          )}

          <label className="block text-sm font-medium text-neutral-800">
            Email
            <input
              autoComplete="email"
              className="mt-2 block w-full rounded border border-neutral-300 px-3 py-2.5 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              maxLength={255}
              name="email"
              required
              type="email"
            />
          </label>

          <label className="block text-sm font-medium text-neutral-800">
            Mật khẩu
            <input
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="mt-2 block w-full rounded border border-neutral-300 px-3 py-2.5 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>

          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <button
            className="w-full rounded bg-emerald-800 px-4 py-3 font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Đang xử lý..." : isRegister ? "Tạo tài khoản" : "Đăng nhập"}
          </button>
        </form>

        <p className="mt-6 text-sm text-neutral-600">
          {isRegister ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
          <Link
            className="font-semibold text-emerald-800 underline underline-offset-4"
            href={isRegister ? "/login" : "/register"}
          >
            {isRegister ? "Đăng nhập" : "Đăng ký"}
          </Link>
        </p>
      </section>
    </main>
  );
}