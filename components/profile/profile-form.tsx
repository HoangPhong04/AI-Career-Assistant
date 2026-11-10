"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { PublicUser } from "@/lib/auth";
import { UserAvatar } from "./user-avatar";

type ProfileFormProps = {
  user: PublicUser;
};

type ApiResponse = {
  data?: { user?: PublicUser };
  error?: { message?: string };
};

const inputClassName =
  "mt-2 block w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100";

function PasswordVisibilityButton({
  visible,
  onClick,
  label,
}: {
  visible: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      aria-label={`${visible ? "Ẩn" : "Hiện"} ${label.toLocaleLowerCase("vi-VN")}`}
      className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-violet-700"
      onClick={onClick}
      type="button"
    >
      {visible ? (
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          <path d="M9.9 5.2A10.8 10.8 0 0112 5c5.5 0 9 5.5 9 7a8.8 8.8 0 01-2.2 3.3M6.2 6.2C3.9 7.7 2 10.6 2 12c0 1.5 3.5 7 10 7a10 10 0 003.2-.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      ) : (
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      )}
    </button>
  );
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(user.fullName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage("");
    setProfileError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim() }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setProfileError(result.error?.message ?? "Không thể cập nhật hồ sơ.");
        return;
      }

      setProfileMessage("Đã lưu thông tin cá nhân.");
      router.refresh();
    } catch {
      setProfileError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setAvatarError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError("Vui lòng chọn ảnh JPG, PNG hoặc WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Ảnh đại diện không được vượt quá 2 MB.");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    setIsUploadingAvatar(true);
    try {
      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setAvatarError(result.error?.message ?? "Không thể cập nhật ảnh đại diện.");
        return;
      }
      if (!result.data?.user?.avatarUrl) {
        setAvatarError("Máy chủ chưa trả về ảnh đại diện mới.");
        return;
      }

      setAvatarUrl(result.data.user.avatarUrl);
      setProfileMessage("Đã cập nhật ảnh đại diện.");
      router.refresh();
    } catch {
      setAvatarError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setPasswordError(result.error?.message ?? "Không thể thay đổi mật khẩu.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Đã thay đổi mật khẩu.");
    } catch {
      setPasswordError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  const displayName = fullName.trim() || user.email;

  return (
    <div className="mt-8 space-y-6">
      <section
        aria-label="Ảnh đại diện"
        className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-7 text-center"
      >
        <button
          aria-label="Chọn ảnh đại diện"
          className="group relative rounded-full outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-wait"
          disabled={isUploadingAvatar}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <UserAvatar name={displayName} size="large" src={avatarUrl} />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/55 text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
            {isUploadingAvatar ? "Đang tải..." : "Đổi ảnh"}
          </span>
        </button>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleAvatarChange}
          ref={fileInputRef}
          type="file"
        />
        <p className="mt-3 text-base font-semibold text-slate-950">{displayName}</p>
        <p className="mt-1 text-xs text-slate-500">JPG, PNG hoặc WebP · tối đa 2 MB</p>
        {avatarError && <p className="mt-3 text-sm text-red-700" role="alert">{avatarError}</p>}
      </section>

      <form
        className="rounded-2xl border border-slate-200 p-5 sm:p-6"
        onSubmit={handleSubmit}
      >
        <h2 className="text-lg font-semibold text-slate-950">Thông tin cá nhân</h2>
        <p className="mt-1 text-sm text-slate-500">Tên đăng nhập của bạn chính là địa chỉ email.</p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium text-neutral-800">
            Họ và tên
            <input
              autoComplete="name"
              className={inputClassName}
              maxLength={100}
              onChange={(event) => setFullName(event.target.value)}
              required
              value={fullName}
            />
          </label>

          <label className="block text-sm font-medium text-neutral-800">
            Email
            <input
              autoComplete="email"
              className={`${inputClassName} bg-slate-50 text-slate-600`}
              readOnly
              value={user.email}
            />
          </label>

          <label className="block text-sm font-medium text-neutral-800 sm:col-span-2">
            Tên đăng nhập
            <input
              autoComplete="username"
              className={`${inputClassName} bg-slate-50 text-slate-600`}
              readOnly
              value={user.email}
            />
          </label>
        </div>

        {profileMessage && <p className="mt-4 text-sm text-emerald-800" role="status">{profileMessage}</p>}
        {profileError && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{profileError}</p>}

        <button
          className="mt-5 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Đang lưu..." : "Lưu thông tin"}
        </button>
      </form>

      <form
        className="rounded-2xl border border-slate-200 p-5 sm:p-6"
        onSubmit={handlePasswordSubmit}
      >
        <h2 className="text-lg font-semibold text-slate-950">Thay đổi mật khẩu</h2>
        <p className="mt-1 text-sm text-slate-500">Nhập mật khẩu hiện tại và xác nhận mật khẩu mới.</p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {([
            ["current", "Mật khẩu hiện tại", currentPassword, setCurrentPassword, "current-password"],
            ["next", "Mật khẩu mới", newPassword, setNewPassword, "new-password"],
            ["confirm", "Xác nhận mật khẩu mới", confirmPassword, setConfirmPassword, "new-password"],
          ] as const).map(([key, label, value, setValue, autoComplete]) => (
            <label
              className={`block text-sm font-medium text-neutral-800 ${key === "current" ? "sm:col-span-2" : ""}`}
              key={key}
            >
              {label}
              <span className="relative block">
                <input
                  autoComplete={autoComplete}
                  className={`${inputClassName} pr-12`}
                  minLength={key === "current" ? undefined : 8}
                  onChange={(event) => setValue(event.target.value)}
                  required
                  type={visiblePasswords[key] ? "text" : "password"}
                  value={value}
                />
                <PasswordVisibilityButton
                  label={label}
                  onClick={() =>
                    setVisiblePasswords((state) => ({ ...state, [key]: !state[key] }))
                  }
                  visible={visiblePasswords[key]}
                />
              </span>
              {key === "next" && (
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  Tối thiểu 8 ký tự.
                </span>
              )}
            </label>
          ))}
        </div>

        {passwordMessage && <p className="mt-4 text-sm text-emerald-800" role="status">{passwordMessage}</p>}
        {passwordError && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{passwordError}</p>}

        <button
          className="mt-5 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
          disabled={isChangingPassword}
          type="submit"
        >
          {isChangingPassword ? "Đang cập nhật..." : "Đổi mật khẩu"}
        </button>
      </form>
    </div>
  );
}
