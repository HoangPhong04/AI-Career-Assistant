"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";

// 1. Định nghĩa kiểu dữ liệu kết quả phân tích
export interface CVAnalysisData {
  id: string;
  originalName: string;
  status: string;
  score: number | null;
  extractedText: string | null;
  analysisJson: {
    isCV?: boolean;
    rejectionReason?: string | null;
    personalInfo?: {
      fullName?: string | null;
      email?: string | null;
      phone?: string | null;
      summary?: string | null;
    };
    skills?: {
      technical: string[];
      soft: string[];
    };
    experience?: Array<{
      company: string;
      role: string;
      duration?: string;
      highlights: string[];
    }>;
    education?: Array<{
      institution: string;
      degree?: string;
      major?: string;
      graduationYear?: string;
    }>;
    strengths?: string[];
    improvements?: string[];
    score?: number;
    assessmentSummary?: string;
  } | null;
  createdAt: string;
}

type StepStatus =
  | "idle"
  | "fetching"
  | "uploading"
  | "analyzing"
  | "success"
  | "error";

const SCAN_STEPS = [
  "Đang tải và nhận diện cấu trúc bố cục tệp...",
  "Đang giải mã văn bản và thông tin ứng viên...",
  "Đang quét danh sách kỹ năng chuyên môn (Technical)...",
  "Đang đối chiếu tiêu chuẩn ATS & kỹ năng mềm...",
  "Đang tổng hợp điểm mạnh, điểm yếu và chấm điểm...",
];

const VISIBLE_HISTORY_COUNT = 3;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoString: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function CVUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [status, setStatus] = useState<StepStatus>("fetching");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cvData, setCvData] = useState<CVAnalysisData | null>(null);
  const [history, setHistory] = useState<CVAnalysisData[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [scanStepIndex, setScanStepIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hiệu ứng luân chuyển bước quét Upzi
  useEffect(() => {
    if (status === "uploading" || status === "analyzing") {
      const interval = setInterval(() => {
        setScanStepIndex((prev) => (prev + 1) % SCAN_STEPS.length);
      }, 1400);
      return () => clearInterval(interval);
    }
  }, [status]);

  // Giải phóng object URL tránh rò rỉ bộ nhớ
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Tải danh sách lịch sử CV
  async function loadHistory() {
    try {
      const res = await fetch("/api/cv");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) setHistory(json.data);
      }
    } catch (e) {
      console.error("Load CV history error:", e);
    }
  }

  // Tải kết quả gần nhất khi mở trang
  useEffect(() => {
    async function loadLatestCV() {
      try {
        const res = await fetch("/api/cv/analyze");
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setCvData(json.data);
            setStatus("success");
          } else {
            setStatus("idle");
          }
        } else {
          setStatus("idle");
        }
      } catch {
        setStatus("idle");
      }
      await loadHistory();
    }
    loadLatestCV();
  }, []);

  // Xác thực và gán file
  function validateAndSetFile(selectedFile: File) {
    setValidationError(null);
    setErrorMessage(null);

    const validExtensions = [".pdf", ".docx"];
    const fileExt = selectedFile.name
      .slice(selectedFile.name.lastIndexOf("."))
      .toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      setValidationError("Chỉ chấp nhận định dạng file .PDF hoặc .DOCX.");
      setFile(null);
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setValidationError("Dung lượng file vượt quá giới hạn 5 MB.");
      setFile(null);
      return;
    }

    if (selectedFile.size === 0) {
      setValidationError("File rỗng (0 bytes). Vui lòng chọn tài liệu hợp lệ.");
      setFile(null);
      return;
    }

    setFile(selectedFile);

    // Tạo preview URL nếu là PDF
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl(null);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetFile(selected);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  }

  // Quá trình gửi file & quét bằng AI
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;

    setErrorMessage(null);
    setStatus("uploading");
    setScanStepIndex(0);

    try {
      // BƯỚC 1: Tải file lên
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/cv/upload", {
        method: "POST",
        body: formData,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadJson.message || "Tải file lên thất bại.");
      }

      const cvId = uploadJson.data?.id;
      if (!cvId) {
        throw new Error("Không nhận được mã định danh CV từ máy chủ.");
      }

      // BƯỚC 2: Gọi AI phân tích và quét CV
      setStatus("analyzing");

      const analyzeRes = await fetch("/api/cv/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId }),
      });

      const analyzeJson = await analyzeRes.json();
      if (!analyzeRes.ok) {
        let message = analyzeJson.message || "Phân tích CV thất bại.";
        if (analyzeJson.code === "EMPTY_TEXT") {
          message =
            "CV dạng scan hình ảnh không có lớp chữ để đọc. Vui lòng tải bản PDF/Word gốc.";
        } else if (analyzeJson.code === "AI_REQUEST_FAILED") {
          message =
            "Hệ thống AI tạm thời bận. Vui lòng thử lại sau giây lát.";
        }
        throw new Error(message);
      }

      // BƯỚC 3: Hoàn tất
      setCvData(analyzeJson.data);
      setStatus("success");
      loadHistory();
    } catch (err: unknown) {
      setStatus("error");
      setErrorMessage((err as Error).message || "Đã xảy ra lỗi ngoài ý muốn.");
    }
  }

  // Reset form
  function handleResetForm() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setValidationError(null);
    setErrorMessage(null);
    setStatus("idle");
    setCvData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Chọn CV từ lịch sử
  function handleSelectHistory(item: CVAnalysisData) {
    setCvData(item);
    setStatus("success");
    setErrorMessage(null);
    setValidationError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const finalScore = cvData?.score ?? cvData?.analysisJson?.score ?? null;
  const isScanning = status === "uploading" || status === "analyzing";
  const visibleHistory = showAllHistory
    ? history
    : history.slice(0, VISIBLE_HISTORY_COUNT);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* HEADER ĐỒNG BỘ VỚI INTERVIEW & CAREER */}
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-violet-700">
          Đánh giá & Tối ưu hồ sơ
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          CV Analyzer
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Tải lên CV (PDF hoặc DOCX) để AI tự động quét hồ sơ trực quan, trích xuất
          kỹ năng và chấm điểm chuẩn ATS trên cùng một màn hình.
        </p>
      </div>

      {/* THÔNG BÁO LỖI NẾU CÓ */}
      {status === "error" && errorMessage && (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Quá trình xử lý không thành công</p>
              <p className="mt-1 text-xs text-red-700">{errorMessage}</p>
            </div>
            <button
              onClick={() => setStatus("idle")}
              className="text-xs font-semibold text-red-800 underline hover:text-red-950"
              type="button"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* BỐ CỤC 2 CỘT CHÍNH (TRÁI: SCANNER & PHÂN TÍCH | PHẢI: LỊCH SỬ THU GỌN) */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* CỘT CHÍNH: TẤT CẢ TẬP TRUNG TRÊN 1 MÀN HÌNH */}
        <div className="min-w-0 space-y-6">
          {/* KHUNG TẢI LÊN FILE */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  {cvData ? "Tải lên bản CV khác để quét" : "Tải lên CV của bạn"}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Hỗ trợ định dạng PDF hoặc DOCX (tối đa 5 MB).
                </p>
              </div>
              {cvData && (
                <button
                  onClick={handleResetForm}
                  type="button"
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  Làm mới
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* VÙNG KÉO THẢ TÀI LIỆU */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
                  isDragOver
                    ? "border-violet-500 bg-violet-50/50"
                    : file
                    ? "border-violet-300 bg-violet-50/20"
                    : "border-slate-300 bg-slate-50/60 hover:border-violet-400 hover:bg-slate-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="sr-only"
                />

                {file ? (
                  <div className="flex flex-col items-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 shadow-sm">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </span>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {file.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatFileSize(file.size)}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="mt-1.5 text-xs font-medium text-violet-700 hover:underline"
                    >
                      Chọn file khác
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition group-hover:scale-105">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                    </span>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      Kéo thả file CV vào đây, hoặc{" "}
                      <span className="font-semibold text-violet-700 underline">
                        duyệt tệp
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Hỗ trợ PDF, DOCX dung lượng tối đa 5MB
                    </p>
                  </div>
                )}
              </div>

              {validationError && (
                <p className="text-xs font-medium text-red-600" role="alert">
                  ⚠️ {validationError}
                </p>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={!file || Boolean(validationError) || isScanning}
                  className="rounded-xl bg-violet-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isScanning
                    ? "Đang quét & phân tích..."
                    : "Bắt đầu quét & phân tích CV"}
                </button>
              </div>
            </form>
          </section>

          {/* TRẠNG THÁI CHƯA CÓ CV VÀ CHƯA QUÉT */}
          {!cvData && !isScanning && status === "idle" && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </span>
              <h3 className="mt-3 font-semibold text-slate-800">
                Chưa có dữ liệu phân tích
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Hãy tải lên bản CV đầu tiên của bạn ở trên để kích hoạt bộ quét hồ sơ
                trực quan và nhận kết quả phân tích.
              </p>
            </div>
          )}

          {/* BẢNG HIỆN HÌNH CV (BẢN QUÉT) & KẾT QUẢ PHÂN TÍCH - CÙNG TRÊN 1 MÀN HÌNH */}
          {(isScanning || cvData) && (
            <div className="space-y-6">
              {/* KHUNG HIỂN THỊ SONG SONG: BÊN TRÁI LÀ BẢN QUÉT CV, BÊN PHẢI LÀ TỔNG QUAN & ĐIỂM SỐ */}
              <div className="grid gap-6 md:grid-cols-[minmax(280px,360px)_1fr]">
                {/* 1. BẢNG HIỆN HÌNH CV VỚI TIA QUÉT LASER UPZI */}
                <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Bản quét hồ sơ
                      </h3>
                    </div>

                    {isScanning ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-200">
                        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-violet-600" />
                        Đang quét...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                        Hoàn tất quét
                      </span>
                    )}
                  </div>

                  {/* KHUNG A4 HIỂN THỊ TÀI LIỆU CV VỚI TIA QUÉT LASER */}
                  <div className="relative mt-3 flex aspect-[1/1.4] w-full flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-inner">
                    {/* BẢNG GIẤY CV A4 */}
                    <div className="relative h-full w-full overflow-hidden bg-white">
                      {/* TIA QUÉT LASER UPZI KHI ĐANG QUÉT */}
                      {isScanning && (
                        <>
                          {/* Tia laser neon chính */}
                          <div className="animate-cv-scan pointer-events-none absolute inset-x-0 z-30 h-1 bg-gradient-to-r from-transparent via-cyan-400 via-violet-500 to-transparent shadow-[0_0_18px_4px_rgba(139,92,246,0.9)]" />

                          {/* Dải sáng phủ theo sau */}
                          <div className="animate-cv-scan pointer-events-none absolute inset-x-0 z-20 h-24 -translate-y-24 bg-gradient-to-b from-violet-500/20 via-violet-500/5 to-transparent" />

                          {/* Lưới radar quét */}
                          <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] opacity-15 [background-size:16px_16px]" />

                          {/* 4 Góc ngắm reticle */}
                          <span className="pointer-events-none absolute top-2.5 left-2.5 z-30 h-3.5 w-3.5 rounded-tl border-t-2 border-l-2 border-violet-500" />
                          <span className="pointer-events-none absolute top-2.5 right-2.5 z-30 h-3.5 w-3.5 rounded-tr border-t-2 border-r-2 border-violet-500" />
                          <span className="pointer-events-none absolute bottom-2.5 left-2.5 z-30 h-3.5 w-3.5 rounded-bl border-b-2 border-l-2 border-violet-500" />
                          <span className="pointer-events-none absolute bottom-2.5 right-2.5 z-30 h-3.5 w-3.5 rounded-br border-b-2 border-r-2 border-violet-500" />

                          {/* Tag nhận diện thông minh */}
                          <div className="pointer-events-none absolute top-4 right-4 z-30 flex flex-col items-end gap-1 text-[10px] font-semibold text-violet-800">
                            <span className="animate-pulse rounded bg-white/95 px-2 py-0.5 shadow-sm ring-1 ring-violet-200">
                              ⚡ Kỹ năng ATS
                            </span>
                            <span className="animate-pulse rounded bg-white/95 px-2 py-0.5 shadow-sm ring-1 ring-violet-200">
                              🔍 Bố cục hồ sơ
                            </span>
                          </div>
                        </>
                      )}

                      {/* HIỂN THỊ NỘI DUNG CV: IFRAME CHO PDF HOẶC BẢN SKELETON MÔ PHỎNG */}
                      {previewUrl ? (
                        <iframe
                          src={`${previewUrl}#toolbar=0&navpanes=0`}
                          className="pointer-events-none h-full w-full select-none border-0 bg-white"
                          title="Bản xem CV"
                        />
                      ) : (
                        <div className="relative h-full w-full select-none p-5 text-slate-800">
                          {/* Header CV */}
                          <div className="border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                                {(
                                  cvData?.analysisJson?.personalInfo?.fullName ||
                                  file?.name ||
                                  "CV"
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h4 className="truncate text-xs font-bold text-slate-900">
                                  {cvData?.analysisJson?.personalInfo?.fullName ||
                                    file?.name ||
                                    "Hồ sơ ứng viên"}
                                </h4>
                                <p className="truncate text-[10px] text-slate-400">
                                  {cvData?.analysisJson?.personalInfo?.email ||
                                    "candidate@example.com"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Các khối nội dung mô phỏng */}
                          <div className="mt-3 space-y-2.5">
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-wider text-violet-700">
                                TÓM TẮT NGHỀ NGHIỆP
                              </p>
                              <div className="mt-1 space-y-1">
                                <div className="h-1.5 w-full rounded bg-slate-100" />
                                <div className="h-1.5 w-5/6 rounded bg-slate-100" />
                              </div>
                            </div>

                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-wider text-violet-700">
                                KỸ NĂNG NHẬN DIỆN
                              </p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {cvData?.analysisJson?.skills?.technical
                                  ?.slice(0, 5)
                                  .map((s, idx) => (
                                    <span
                                      key={idx}
                                      className="rounded bg-violet-50 px-1.5 py-0.5 text-[8px] font-semibold text-violet-700"
                                    >
                                      {s}
                                    </span>
                                  )) || (
                                  <>
                                    <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[8px] font-medium text-violet-600">
                                      Kỹ thuật chuyên môn
                                    </span>
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-medium text-slate-600">
                                      Kỹ năng mềm
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-wider text-violet-700">
                                KINH NGHIỆM LÀM VIỆC
                              </p>
                              <div className="mt-1 space-y-1">
                                <div className="h-2 w-1/2 rounded bg-slate-200" />
                                <div className="h-1.5 w-full rounded bg-slate-100" />
                                <div className="h-1.5 w-4/5 rounded bg-slate-100" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* HUD STATUS QUÉT THỜI GIAN THỰC */}
                  {isScanning && (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50/80 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
                        <span className="text-[11px] font-semibold text-slate-800">
                          {SCAN_STEPS[scanStepIndex]}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-violet-700">
                        {status === "uploading" ? "45%" : "85%"}
                      </span>
                    </div>
                  )}
                </section>

                {/* 2. BẢNG ĐIỂM SỐ & THÔNG TIN TỔNG QUAN (NGAY BÊN CẠNH BẢN QUÉT) */}
                <div className="flex flex-col justify-between space-y-4">
                  {/* CARD ĐIỂM & THÔNG TIN ỨNG VIÊN */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          ĐÃ QUÉT & PHÂN TÍCH
                        </span>
                        <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                          {cvData?.analysisJson?.personalInfo?.fullName ||
                            cvData?.originalName ||
                            file?.name}
                        </h3>
                        {cvData && (
                          <p
                            className="mt-0.5 text-xs text-slate-500"
                            suppressHydrationWarning
                          >
                            Tệp: {cvData.originalName} • Cập nhật:{" "}
                            {formatDate(cvData.createdAt)}
                          </p>
                        )}
                      </div>

                      {/* ĐIỂM SỐ ATS */}
                      <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:flex-col sm:items-end">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Điểm ATS
                        </span>
                        <span
                          className={`text-2xl font-extrabold ${
                            (finalScore ?? 0) >= 80
                              ? "text-emerald-700"
                              : (finalScore ?? 0) >= 60
                              ? "text-violet-700"
                              : "text-amber-700"
                          }`}
                        >
                          {finalScore !== null ? `${finalScore}/100` : "--"}
                        </span>
                      </div>
                    </div>

                    {/* TIẾN ĐỘ ĐIỂM */}
                    {finalScore !== null && (
                      <div className="mt-4">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              finalScore >= 80
                                ? "bg-emerald-600"
                                : finalScore >= 60
                                ? "bg-violet-600"
                                : "bg-amber-600"
                            }`}
                            style={{ width: `${Math.min(finalScore, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* NHẬN XÉT TỔNG QUAN */}
                    {cvData?.analysisJson?.assessmentSummary && (
                      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Nhận xét tổng quan AI
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                          {cvData.analysisJson.assessmentSummary}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* KỸ NĂNG NHẬN DIỆN */}
                  <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Kỹ năng trích xuất
                    </h4>
                    <div className="mt-3 space-y-3">
                      <div>
                        <span className="text-[11px] font-medium text-slate-600">
                          Kỹ thuật (Technical):
                        </span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {cvData?.analysisJson?.skills?.technical &&
                          cvData.analysisJson.skills.technical.length > 0 ? (
                            cvData.analysisJson.skills.technical.map(
                              (skill, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200/60"
                                >
                                  {skill}
                                </span>
                              )
                            )
                          ) : (
                            <span className="text-xs text-slate-400">
                              {isScanning
                                ? "Đang trích xuất kỹ thuật..."
                                : "Chưa phát hiện rõ ràng."}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-1">
                        <span className="text-[11px] font-medium text-slate-600">
                          Kỹ năng mềm (Soft Skills):
                        </span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {cvData?.analysisJson?.skills?.soft &&
                          cvData.analysisJson.skills.soft.length > 0 ? (
                            cvData.analysisJson.skills.soft.map((skill, idx) => (
                              <span
                                key={idx}
                                className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                              >
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">
                              {isScanning
                                ? "Đang trích xuất kỹ năng mềm..."
                                : "Chưa phát hiện kỹ năng mềm."}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PHẦN DƯỚI: ĐIỂM MẠNH, CẢI THIỆN & HÀNH ĐỘNG TIẾP THEO (HIỂN THỊ LIỀN MẠCH) */}
              {cvData && cvData.analysisJson && (
                <>
                  {/* CẢNH BÁO NẾU KHÔNG PHẢI LÀ CV */}
                  {cvData.analysisJson.isCV === false ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-amber-900 shadow-sm">
                      <div className="flex items-start gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg text-amber-700">
                          ⚠️
                        </span>
                        <div>
                          <h3 className="text-base font-bold text-amber-950">
                            Tài liệu tải lên không phải là Hồ sơ xin việc (CV)
                          </h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-amber-800">
                            {cvData.analysisJson.rejectionReason ||
                              "Hệ thống không tìm thấy các thông tin đặc trưng của một hồ sơ nghề nghiệp."}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* ĐIỂM MẠNH & GỢI Ý CẢI THIỆN (CHIA ĐÔI) */}
                      <div className="grid gap-6 sm:grid-cols-2">
                        {/* ĐIỂM MẠNH */}
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
                          <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-950">
                            <span>🌟</span> Điểm mạnh nổi bật
                          </h4>
                          <ul className="mt-3.5 space-y-2 text-xs leading-relaxed text-emerald-900">
                            {cvData.analysisJson.strengths?.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="font-bold text-emerald-600">
                                  ✓
                                </span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* CẦN CẢI THIỆN */}
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6">
                          <h4 className="flex items-center gap-2 text-sm font-bold text-amber-950">
                            <span>💡</span> Gợi ý hoàn thiện hồ sơ
                          </h4>
                          <ul className="mt-3.5 space-y-2 text-xs leading-relaxed text-amber-900">
                            {cvData.analysisJson.improvements?.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="font-bold text-amber-600">
                                  •
                                </span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* KINH NGHIỆM LÀM VIỆC */}
                      {cvData.analysisJson.experience &&
                        cvData.analysisJson.experience.length > 0 && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                            <h3 className="text-base font-semibold text-slate-950">
                              Lịch sử kinh nghiệm
                            </h3>
                            <div className="mt-4 divide-y divide-slate-100">
                              {cvData.analysisJson.experience.map((exp, idx) => (
                                <div
                                  key={idx}
                                  className="py-3.5 first:pt-1 last:pb-0"
                                >
                                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <h4 className="text-sm font-bold text-slate-900">
                                      {exp.role}
                                    </h4>
                                    {exp.duration && (
                                      <span className="text-xs text-slate-400">
                                        {exp.duration}
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-0.5 text-xs font-semibold text-violet-700">
                                    {exp.company}
                                  </p>
                                  {exp.highlights &&
                                    exp.highlights.length > 0 && (
                                      <ul className="mt-2 space-y-1 text-xs leading-relaxed text-slate-600">
                                        {exp.highlights.map((h, hIdx) => (
                                          <li
                                            key={hIdx}
                                            className="flex items-start gap-2"
                                          >
                                            <span className="text-slate-400">
                                              -
                                            </span>
                                            <span>{h}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* SMART CTA */}
                      <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-6 shadow-sm sm:p-7">
                        <p className="text-xs font-bold uppercase tracking-wider text-violet-700">
                          BƯỚC TIẾP THEO THÔNG MINH
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-slate-950">
                          Tối ưu hóa hành trình nghề nghiệp của bạn
                        </h3>
                        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600">
                          Dùng các kỹ năng vừa trích xuất để tạo lộ trình thăng
                          tiến hoặc bắt đầu luyện phỏng vấn AI ngay.
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <Link
                            href="/career"
                            className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800"
                          >
                            Tạo lộ trình nghề nghiệp →
                          </Link>
                          <Link
                            href="/interview"
                            className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-5 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                          >
                            Luyện phỏng vấn AI
                          </Link>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* CỘT PHẢI (SIDEBAR): LỊCH SỬ THU GỌN & MẸO NHANH */}
        <aside className="space-y-6">
          {/* CARD LỊCH SỬ CV (CÓ NÚT THU GỌN / XEM THÊM) */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-950">
                Lịch sử CV ({history.length})
              </h2>
              <button
                className="text-xs font-semibold text-violet-700 hover:underline"
                onClick={handleResetForm}
                type="button"
              >
                + Tải CV mới
              </button>
            </div>

            {history.length > 0 ? (
              <div className="mt-4 space-y-2">
                <ul className="space-y-2">
                  {visibleHistory.map((item) => {
                    const isCurrent = cvData?.id === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => handleSelectHistory(item)}
                          type="button"
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            isCurrent
                              ? "border-violet-300 bg-violet-50/70 ring-1 ring-violet-200"
                              : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {item.originalName}
                            </p>
                            <span
                              className={`shrink-0 text-xs font-bold ${
                                item.score !== null
                                  ? item.score >= 80
                                    ? "text-emerald-700"
                                    : item.score >= 60
                                    ? "text-violet-700"
                                    : "text-amber-700"
                                  : "text-slate-400"
                              }`}
                            >
                              {item.score !== null ? `${item.score}/100` : "--"}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                            <span suppressHydrationWarning>
                              {formatDate(item.createdAt)}
                            </span>
                            <span
                              className={`font-semibold ${
                                item.status === "ANALYZED"
                                  ? "text-emerald-700"
                                  : item.status === "FAILED"
                                  ? "text-red-600"
                                  : "text-amber-600"
                              }`}
                            >
                              {item.status === "ANALYZED"
                                ? "Đã duyệt"
                                : item.status}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {/* NÚT XEM THÊM / THU GỌN LỊCH SỬ */}
                {history.length > VISIBLE_HISTORY_COUNT && (
                  <button
                    type="button"
                    onClick={() => setShowAllHistory(!showAllHistory)}
                    className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50/60 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    {showAllHistory ? (
                      <>Thu gọn danh sách ▲</>
                    ) : (
                      <>
                        Xem thêm {history.length - VISIBLE_HISTORY_COUNT} CV khác
                        ▼
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Các file CV đã phân tích sẽ xuất hiện ở đây.
              </p>
            )}
          </section>

          {/* CARD MẸO TỐI ƯU HỒ SƠ */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-950">
              💡 Mẹo tối ưu điểm CV
            </h3>
            <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-600">
              <li className="flex items-start gap-2">
                <span className="font-bold text-violet-600">•</span>
                <span>
                  Sử dụng <strong>từ khóa kỹ thuật</strong> chuẩn ngành để hệ
                  thống ATS nhận diện chính xác.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-violet-600">•</span>
                <span>
                  Đo lường thành tích bằng <strong>con số cụ thể</strong> (%, số
                  lượng người dùng, doanh số).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-violet-600">•</span>
                <span>
                  Ưu tiên file <strong>PDF dạng chữ gốc</strong> (không scan hình
                  ảnh) để AI đọc dữ liệu trọn vẹn.
                </span>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
