"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

// 1. Định nghĩa kiểu dữ liệu kết quả phân tích
interface CVAnalysisData {
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

export function CVUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [status, setStatus] = useState<StepStatus>("fetching");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cvData, setCvData] = useState<CVAnalysisData | null>(null);

  // 2. Tự động lấy kết quả phân tích gần nhất khi vừa mở trang
  useEffect(() => {
    async function loadLatestCV() {
      try {
        const res = await fetch("/api/cv/analyze");
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setCvData(json.data);
            setStatus("success");
            return;
          }
        }
        // Chưa có CV hoặc 404
        setStatus("idle");
      } catch {
        setStatus("idle");
      }
    }
    loadLatestCV();
  }, []);

  // 3. Client-side Validation khi người dùng chọn file
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setValidationError(null);
    setErrorMessage(null);
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      return;
    }

    // Kiểm tra định dạng đuôi file
    const validExtensions = [".pdf", ".docx"];
    const fileExt = selectedFile.name
      .slice(selectedFile.name.lastIndexOf("."))
      .toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      setValidationError("Chỉ chấp nhận file định dạng .PDF hoặc .DOCX.");
      setFile(null);
      return;
    }

    // Kiểm tra dung lượng (tối đa 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setValidationError("Kích thước file vượt quá giới hạn 5 MB.");
      setFile(null);
      return;
    }

    if (selectedFile.size === 0) {
      setValidationError("File được chọn không có nội dung (0 bytes).");
      setFile(null);
      return;
    }

    setFile(selectedFile);
  }

  // 4. Luồng gửi file: Upload -> Lấy cvId -> Gọi AI Analyze
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;

    setErrorMessage(null);
    setStatus("uploading");

    try {
      // BƯỚC 1: Upload file lên server
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

      // BƯỚC 2: Gọi AI phân tích CV
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
            "CV dạng ảnh scan không có lớp chữ để đọc. Vui lòng tải bản PDF/Word gốc.";
        } else if (analyzeJson.code === "AI_REQUEST_FAILED") {
          message =
            "Hệ thống AI tạm thời bận hoặc quá tải. Vui lòng thử lại sau giây lát.";
        }
        throw new Error(message);
      }

      // BƯỚC 3: Hoàn thành, lưu dữ liệu để hiển thị
      setCvData(analyzeJson.data);
      setStatus("success");
      setFile(null);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMessage((err as Error).message || "Đã xảy ra lỗi ngoài ý muốn.");
    }
  }

  // ---------------- GIAO DIỆN ----------------

  // TRẠNG THÁI LOADING BAN ĐẦU
  if (status === "fetching") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        <p className="mt-4 text-sm font-medium">
          Đang tải dữ liệu hồ sơ của bạn...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KHUNG TẢI LÊN (UPLOAD BOX) */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">
          {cvData
            ? "Tải lên bản CV mới để phân tích lại"
            : "Tải lên CV của bạn"}
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Hỗ trợ định dạng PDF hoặc DOCX (tối đa 5 MB). AI sẽ tự động trích xuất
          kỹ năng và đánh giá điểm mạnh/yếu.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              disabled={status === "uploading" || status === "analyzing"}
              className={`block w-full text-sm text-neutral-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-800 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-900 file:cursor-pointer disabled:opacity-50 ${
                validationError ? "border-red-500 text-red-600" : ""
              }`}
            />
            {/* THÔNG BÁO LỖI VALIDATION PHÍA CLIENT */}
            {validationError && (
              <p className="mt-2 text-xs font-medium text-red-600">
                ⚠️ {validationError}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={
                !file ||
                Boolean(validationError) ||
                status === "uploading" ||
                status === "analyzing"
              }
              className="inline-flex items-center justify-center rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "uploading" && "Đang tải file lên..."}
              {status === "analyzing" && "AI đang phân tích..."}
              {status !== "uploading" &&
                status !== "analyzing" &&
                "Bắt đầu phân tích"}
            </button>

            {file && status === "idle" && (
              <span className="text-xs text-neutral-500">
                Đã chọn: {file.name}
              </span>
            )}
          </div>
        </form>

        {/* LOADING INDICATOR TRONG LÚC XỬ LÝ */}
        {(status === "uploading" || status === "analyzing") && (
          <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="flex items-center gap-3 text-emerald-900">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
              <div className="text-sm font-medium">
                {status === "uploading" &&
                  "Bước 1/2: Đang tải tài liệu lên máy chủ..."}
                {status === "analyzing" &&
                  "Bước 2/2: AI đang đọc văn bản và trích xuất thông tin hồ sơ..."}
              </div>
            </div>
          </div>
        )}

        {/* ERROR STATE TỪ PHÍA SERVER */}
        {status === "error" && errorMessage && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
            <div className="flex items-start gap-2">
              <span className="text-base">❌</span>
              <div>
                <p className="text-sm font-semibold">
                  Quá trình phân tích thất bại
                </p>
                <p className="mt-1 text-xs text-red-700">{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="mt-2 text-xs font-semibold text-red-800 underline hover:text-red-900"
                >
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* EMPTY STATE: KHI CHƯA CÓ KẾT QUẢ NÀO */}
      {!cvData && status === "idle" && (
        <div className="rounded-xl border border-dashed border-neutral-300 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-2xl">
            📄
          </div>
          <h3 className="mt-3 text-sm font-semibold text-neutral-900">
            Chưa có kết quả phân tích
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Hãy tải lên CV đầu tiên của bạn ở trên để nhận điểm số đánh giá và
            gợi ý cải thiện từ AI.
          </p>
        </div>
      )}

      {/* RESULT STATE: HIỂN THỊ KẾT QUẢ PHÂN TÍCH */}
      {cvData && cvData.analysisJson && (
        <div className="space-y-6">
          {/* NẾU KHÔNG PHẢI LÀ CV: HIỆN CẢNH BÁO */}
          {cvData.analysisJson.isCV === false ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="text-base font-bold text-amber-950">
                    Tài liệu tải lên không phải là CV / Hồ sơ xin việc
                  </h3>
                  <p className="mt-2 text-sm text-amber-800">
                    {cvData.analysisJson.rejectionReason ||
                      "Hệ thống không tìm thấy các thông tin đặc trưng của một hồ sơ nghề nghiệp (thông tin cá nhân, học vấn, kỹ năng, kinh nghiệm)."}
                  </p>
                  <p className="mt-3 text-xs font-medium text-amber-700">
                    💡 Gợi ý: Vui lòng tải lên file CV cá nhân ở định dạng PDF hoặc Word để hệ thống có thể chấm điểm và hỗ trợ bạn tạo lộ trình nghề nghiệp.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* HEADER KẾT QUẢ & ĐIỂM SỐ */}
              <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="inline-block rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    ĐÃ PHÂN TÍCH THÀNH CÔNG
                  </div>
                  <h3 className="mt-2 text-xl font-bold text-neutral-900">
                    {cvData.analysisJson.personalInfo?.fullName ||
                      cvData.originalName}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    File: {cvData.originalName} • Cập nhật lúc:{" "}
                    {new Date(cvData.createdAt).toLocaleDateString("vi-VN")}
                  </p>
                </div>

                {/* SCORE BADGE */}
                <div className="flex items-center gap-3 rounded-xl bg-neutral-50 px-5 py-3 border border-neutral-200">
                  <div className="text-right">
                    <div className="text-xs font-medium text-neutral-500">
                      ĐIỂM ĐÁNH GIÁ
                    </div>
                    <div className="text-2xl font-black text-emerald-700">
                      {cvData.score ?? cvData.analysisJson.score ?? "N/A"}/100
                    </div>
                  </div>
                </div>
              </div>

              {/* TỔNG QUAN HỒ SƠ */}
              {cvData.analysisJson.assessmentSummary && (
                <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
                    Nhận xét tổng quan
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-800">
                    {cvData.analysisJson.assessmentSummary}
                  </p>
                </div>
              )}

              {/* KỸ NĂNG (SKILLS) */}
              <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
                  Kỹ năng nhận diện
                </h4>
                <div className="mt-4 space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-neutral-600">
                      Kỹ thuật (Technical):
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {cvData.analysisJson.skills?.technical.map((skill, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-800"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-neutral-600">
                      Kỹ năng mềm (Soft Skills):
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {cvData.analysisJson.skills?.soft.map((skill, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ĐIỂM MẠNH & ĐIỂM CẦN CẢI THIỆN */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                    <span>🌟</span> Điểm mạnh nổi bật
                  </h4>
                  <ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-relaxed text-emerald-950">
                    {cvData.analysisJson.strengths?.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-6">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-amber-900">
                    <span>💡</span> Góp ý cần cải thiện
                  </h4>
                  <ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-relaxed text-amber-950">
                    {cvData.analysisJson.improvements?.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* KINH NGHIỆM LÀM VIỆC (EXPERIENCE) */}
              {cvData.analysisJson.experience &&
                cvData.analysisJson.experience.length > 0 && (
                  <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
                      Lịch sử kinh nghiệm
                    </h4>
                    <div className="mt-4 divide-y divide-neutral-100">
                      {cvData.analysisJson.experience.map((exp, idx) => (
                        <div key={idx} className="py-3.5 first:pt-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-neutral-900">
                              {exp.role}
                            </span>
                            <span className="text-xs text-neutral-400">
                              {exp.duration}
                            </span>
                          </div>
                          <div className="text-xs font-medium text-emerald-800">
                            {exp.company}
                          </div>
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-neutral-600">
                            {exp.highlights?.map((h, hIdx) => (
                              <li key={hIdx}>{h}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
