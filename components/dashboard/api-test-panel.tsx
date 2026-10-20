"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const endpoints = [
  { label: "Kiểm tra session", path: "/api/auth/me" },
  { label: "Đọc profile", path: "/api/profile" },
  { label: "CV analyze", path: "/api/cv/analyze" },
  { label: "Career analyze", path: "/api/career/analyze" },
  { label: "Career roadmap", path: "/api/career/roadmap" },
  { label: "Interview session", path: "/api/interview/session" },
  { label: "Interview question", path: "/api/interview/question" },
  { label: "Interview evaluate", path: "/api/interview/evaluate" },
] as const;

type TestResult = {
  path: string;
  status: number;
  body: string;
};

export function ApiTestPanel() {
  const router = useRouter();
  const [pending, setPending] = useState("");
  const [result, setResult] = useState<TestResult | null>(null);

  async function testEndpoint(path: string) {
    setPending(path);
    setResult(null);

    try {
      const response = await fetch(path);
      const body = await response.text();
      setResult({ path, status: response.status, body });
    } catch {
      setResult({ path, status: 0, body: "Không thể kết nối máy chủ." });
    } finally {
      setPending("");
    }
  }

  async function logoutAndOpenRegister() {
    setPending("/api/auth/logout");
    setResult(null);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setResult({
          path: "/api/auth/logout",
          status: response.status,
          body: "Không thể đăng xuất.",
        });
        return;
      }

      router.replace("/register");
      router.refresh();
    } catch {
      setResult({
        path: "/api/auth/logout",
        status: 0,
        body: "Không thể kết nối máy chủ.",
      });
    } finally {
      setPending("");
    }
  }

  return (
    <section className="mt-8 border-t border-neutral-200 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">Kiểm thử nhanh API</h2>
          <p className="mt-1 text-sm text-neutral-600">Mỗi nút gửi request và hiển thị status cùng response.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-100" href="/cv">
            Mở CV upload
          </Link>
          <Link className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-100" href="/profile">
            Mở profile
          </Link>
          <button
            className="rounded bg-emerald-800 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
            disabled={pending !== ""}
            onClick={logoutAndOpenRegister}
            type="button"
          >
            Đăng xuất → đăng ký
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {endpoints.map((endpoint) => (
          <button
            className="min-h-11 rounded border border-neutral-300 px-3 py-2 text-left text-sm font-medium text-neutral-800 hover:border-emerald-800 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
            disabled={pending !== ""}
            key={endpoint.path}
            onClick={() => testEndpoint(endpoint.path)}
            type="button"
          >
            {pending === endpoint.path ? "Đang gửi..." : endpoint.label}
            <span className="mt-1 block truncate text-xs font-normal text-neutral-500">GET {endpoint.path}</span>
          </button>
        ))}
      </div>

      {result && (
        <div aria-live="polite" className="mt-5" role="status">
          <p className="text-sm font-semibold text-neutral-800">
            {result.status === 0 ? "Network error" : `HTTP ${result.status}`} · {result.path}
          </p>
          <pre className="mt-2 max-h-64 overflow-auto rounded border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-800">
            {result.body}
          </pre>
        </div>
      )}
    </section>
  );
}