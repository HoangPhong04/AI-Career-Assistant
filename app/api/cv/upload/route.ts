
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { validateCVFile } from "@/lib/cv/validate-cv-file";
import { saveCVFile, deleteCVFile } from "@/lib/cv/cv-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let savedFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Please upload a CV file using the 'file' field." },
        { status: 400 },
      );
    }

    const validation = await validateCVFile(file);

    if (!validation.valid) {
      const status =
        validation.code === "FILE_TOO_LARGE" ? 413 : 400;

      return NextResponse.json(
        {
          message: validation.message,
          code: validation.code,
        },
        { status },
      );
    }

    /*
     * TODO: Tích hợp authentication tại đây.
     * Chỉ lấy userId từ session đã xác thực.
     * Không lấy userId từ formData hoặc request body.
     *
     * Chưa tạo CV record cho đến khi có userId đáng tin cậy.
     */
    return NextResponse.json(
      {
        message: "File validation succeeded. Authentication integration is required before saving the CV.",
        fileName: file.name,
        fileSize: file.size,
        fileType: validation.mimeType,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("CV upload error:", error);

    if (savedFilePath) {
      try {
        await deleteCVFile(savedFilePath);
      } catch (cleanupError) {
        console.error("Failed to clean up uploaded CV:", cleanupError);
      }
    }

    return NextResponse.json(
      { message: "An unexpected error occurred while uploading the CV." },
      { status: 500 },
    );
  }
}
