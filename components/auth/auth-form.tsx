"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type AuthFormProps = {
  mode: "login" | "register";
};

type ApiResponse = {
  error?: { code?: string; message?: string };
};

const errorMessages: Record<string, string> = {
  EMAIL_ALREADY_EXISTS: "Email này đã được sử dụng. Hãy đăng nhập hoặc dùng email khác.",
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không chính xác.",
  VALIDATION_ERROR: "Thông tin chưa hợp lệ. Hãy kiểm tra email và mật khẩu (8–72 byte).",
  INTERNAL_ERROR: "Chưa thể xử lý yêu cầu lúc này. Vui lòng thử lại sau.",
};

function FieldIcon({ kind }: { kind: "email" | "password" | "name" }) {
  if (kind === "email") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <rect height="14" rx="2" stroke="currentColor" strokeWidth="1.6" width="18" x="3" y="5" />
        <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }

  if (kind === "password") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <rect height="10" rx="2" stroke="currentColor" strokeWidth="1.6" width="14" x="5" y="11" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const body: Record<string, string> = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };
    if (isRegister) body.fullName = String(formData.get("fullName") ?? "");

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        const code = result.error?.code;
        setError((code && errorMessages[code]) || result.error?.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
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

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100";

  return (
    <main className="auth-page">
      <section aria-label="AI Career Assistant" className="auth-brand-panel">
        <Link className="auth-brand" href="/">
          <span aria-hidden="true" className="auth-brand-mark">
            <svg fill="none" viewBox="0 0 24 24">
              <path d="M8 8V5m8 3V5M5 10h14v9H5z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
              <path d="M9 14h.01M15 14h.01M9 17h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            </svg>
          </span>
          <span>AI Career Assistant</span>
        </Link>

        <div className="auth-brand-copy">
          <p className="auth-eyebrow">BẠN SẴN SÀNG BỨT PHÁ?</p>
          <h2>Tối ưu CV &amp; chinh phục phỏng vấn với AI</h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-indigo-100/75">
            Phân tích lỗ hổng kỹ năng, gợi ý lộ trình nghề nghiệp chuẩn hóa và mô phỏng phỏng vấn thời gian thực.
          </p>
          <ul className="mt-8 space-y-4 text-sm text-indigo-50">
            <li className="flex items-center gap-3">
              <span className="auth-check">✓</span> Chấm điểm &amp; trích xuất kỹ năng CV tự động
            </li>
            <li className="flex items-center gap-3">
              <span className="auth-check">✓</span> Lộ trình học cá nhân hóa theo mục tiêu
            </li>
            <li className="flex items-center gap-3">
              <span className="auth-check">✓</span> Phỏng vấn kỹ thuật giả lập cùng AI
            </li>
          </ul>
        </div>

        <p className="auth-brand-footer">Dự án xây dựng trên Next.js, PostgreSQL &amp; Prisma</p>
      </section>

      <section className="auth-form-panel">
        <div className="w-full max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-violet-700 md:hidden">
            AI Career Assistant
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {isRegister ? "Tạo tài khoản mới" : "Chào mừng trở lại!"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isRegister
              ? "Bắt đầu xây dựng lộ trình nghề nghiệp của bạn."
              : "Nhập tài khoản để tiếp tục theo dõi tiến độ của bạn"}
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {isRegister && (
              <label className="block text-sm font-medium text-slate-700">
                Họ và tên
                <span className="relative mt-2 block">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <FieldIcon kind="name" />
                  </span>
                  <input
                    autoComplete="name"
                    className={inputClass}
                    maxLength={100}
                    name="fullName"
                    placeholder="Nguyễn An"
                    required
                    type="text"
                  />
                </span>
              </label>
            )}

            <label className="block text-sm font-medium text-slate-700">
              Địa chỉ Email
              <span className="relative mt-2 block">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <FieldIcon kind="email" />
                </span>
                <input
                  autoComplete="email"
                  className={inputClass}
                  maxLength={255}
                  name="email"
                  placeholder="name@example.com"
                  required
                  type="email"
                />
              </span>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              <span className="flex items-center justify-between">
                Mật khẩu
                {!isRegister && (
                  <span className="text-xs font-normal text-slate-400">Tối thiểu 8 ký tự</span>
                )}
              </span>
              <span className="relative mt-2 block">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <FieldIcon kind="password" />
                </span>
                <input
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  className={`${inputClass} pr-12`}
                  minLength={8}
                  name="password"
                  placeholder="Tối thiểu 8 ký tự"
                  required
                  type={showPassword ? "text" : "password"}
                />
                <button
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-violet-600"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="1.6" />
                    <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
                    {showPassword && <path d="m4 4 16 16" stroke="currentColor" strokeWidth="1.6" />}
                  </svg>
                </button>
              </span>
            </label>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <button
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? "Đang xử lý..."
                : isRegister
                  ? "Đăng ký"
                  : "Đăng nhập"}
              {!isSubmitting && (
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                </svg>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            {isRegister ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
            <Link
              className="font-semibold text-violet-700 hover:text-violet-800"
              href={isRegister ? "/login" : "/register"}
            >
              {isRegister ? "Đăng nhập" : "Đăng ký ngay"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
