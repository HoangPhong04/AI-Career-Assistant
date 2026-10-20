"use client";

import { useState, type FormEvent } from "react";

type UploadResult = {
  status: number;
  body: string;
};

export function CVUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || pending) return;

    setPending(true);
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/cv/upload", {
        method: "POST",
        body: formData,
      });
      setResult({ status: response.status, body: await response.text() });
    } catch {
      setResult({ status: 0, body: "Không thể kết nối máy chủ." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-8 max-w-2xl border-t border-neutral-200 pt-6">
      <h2 className="text-lg font-semibold text-neutral-950">Tải CV lên</h2>
      <form className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-end" onSubmit={handleSubmit}>
        <label className="block w-full text-sm font-medium text-neutral-800">
          Chọn file PDF hoặc DOCX (tối đa 5 MB)
          <input
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="mt-2 block w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-emerald-800 file:px-3 file:py-2 file:font-semibold file:text-white"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setResult(null);
            }}
            required
            type="file"
          />
        </label>
        <button
          className="shrink-0 rounded bg-emerald-800 px-4 py-2.5 font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!file || pending}
          type="submit"
        >
          {pending ? "Đang tải..." : "Upload CV"}
        </button>
      </form>

      {result && (
        <div aria-live="polite" className="mt-5" role="status">
          <p className="text-sm font-semibold text-neutral-800">
            {result.status === 0 ? "Network error" : `HTTP ${result.status}`}
          </p>
          <pre className="mt-2 max-h-64 overflow-auto rounded border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-800">
            {result.body}
          </pre>
        </div>
      )}
    </section>
  );
}