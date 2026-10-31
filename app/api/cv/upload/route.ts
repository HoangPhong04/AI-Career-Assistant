import { getCurrentUser } from "@/lib/auth";
import { deleteCVFile, saveCVFile } from "@/lib/cv/cv-storage";
import { validateCVFile } from "@/lib/cv/validate-cv-file";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return apiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để tiếp tục.");
  }

  let savedFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Vui lòng chọn file CV hợp lệ bằng trường 'file'." },
        { status: 400 }
      );
    }

    // 1. Validate file (Size, Mime, Extension, Signature)
    const validation = await validateCVFile(file);
    if (!validation.valid) {
      const status = validation.code === "FILE_TOO_LARGE" ? 413 : 400;
      return NextResponse.json(
        { message: validation.message, code: validation.code },
        { status }
      );
    }

    // 2. Chống upload trùng lặp: Kiểm tra CV cùng tên đã phân tích thành công chưa
    const existingCV = await prisma.cV.findFirst({
      where: {
        userId: currentUser.id,
        originalName: file.name,
        status: "ANALYZED",
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingCV) {
      return NextResponse.json(
        {
          message: "Tài liệu này đã từng được tải lên và phân tích trước đó.",
          code: "DUPLICATE_UPLOAD",
          data: existingCV,
          isDuplicate: true,
        },
        { status: 200 } // Trả về 200 kèm data cũ để frontend dùng ngay, không cần gọi AI lại
      );
    }

    // 3. Lưu file vào ổ đĩa vật lý
    const savedFile = await saveCVFile(file, validation.extension);
    savedFilePath = savedFile.absolutePath;

    // 4. Tạo bản ghi trạng thái UPLOADED
    const cv = await prisma.cV.create({
      data: {
        userId: currentUser.id,
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

    savedFilePath = null; // Thành công, không cần dọn dẹp
    return NextResponse.json(
      { message: "CV uploaded successfully.", data: cv },
      { status: 201 }
    );
  } catch (error) {
    console.error("CV upload error:", error);

    // Luôn dọn dẹp file thừa nếu gặp lỗi bất ngờ
    if (savedFilePath) {
      try {
        await deleteCVFile(savedFilePath);
      } catch (cleanupError) {
        console.error("Failed to cleanup file:", cleanupError);
      }
    }

    return NextResponse.json(
      {
        message: "Đã xảy ra lỗi hệ thống khi tải tệp lên.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
