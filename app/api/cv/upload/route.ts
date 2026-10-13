import { NextResponse } from "next/server";

import { deleteCVFile, saveCVFile } from "@/lib/cv/cv-storage";
import { validateCVFile } from "@/lib/cv/validate-cv-file";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const TEST_USER_ID = "761592b6-e73b-4c7e-9a7a-c1c7ffeeb53a";

export async function POST(request: Request) {
  let savedFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Please upload a CV file using the 'file' field." },
        { status: 400 }
      );
    }

    const validation = await validateCVFile(file);

    if (!validation.valid) {
      const status = validation.code === "FILE_TOO_LARGE" ? 413 : 400;

      return NextResponse.json(
        {
          message: validation.message,
          code: validation.code,
        },
        { status }
      );
    }
    const user = await prisma.user.findUnique({
      where: {
        id: TEST_USER_ID,
      },
      select: {
        id: true,
      },
    });
    if (!user) {
      return NextResponse.json(
        {
          message:
            "Test user not found. Please create the test user and configure TEST_USER_ID.",
        },
        { status: 500 }
      );
    }

    // 5. Lưu file vào storage/cvs/
    const savedFile = await saveCVFile(file, validation.extension);

    savedFilePath = savedFile.absolutePath;

    // 6. Tạo bản ghi CV trong database
    const cv = await prisma.cV.create({
      data: {
        userId: user.id,
        originalName: file.name,
        filePath: savedFile.filePath,
        fileType: validation.mimeType,
        status: "UPLOADED",
      },
      select: {
        id: true,
        userId: true,
        originalName: true,
        filePath: true,
        fileType: true,
        status: true,
        createdAt: true,
      },
    });

    // Database đã tạo CV thành công, không xóa file nữa.
    savedFilePath = null;

    // 7. Trả kết quả
    return NextResponse.json(
      {
        message: "CV uploaded successfully.",
        data: cv,
      },
      { status: 201 }
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
      { status: 500 }
    );
  }
}
