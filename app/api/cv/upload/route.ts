import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteCVFile, saveCVFile } from "@/lib/cv/cv-storage";
import { validateCVFile } from "@/lib/cv/validate-cv-file";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return apiError(401, "UNAUTHENTICATED", "Please sign in to continue");
  }

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
      const status = validation.code === "FILE_TOO_LARGE" ? 413 : 400;
      return NextResponse.json(
        { message: validation.message, code: validation.code },
        { status },
      );
    }

    const savedFile = await saveCVFile(file, validation.extension);
    savedFilePath = savedFile.absolutePath;

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

    savedFilePath = null;
    return NextResponse.json(
      { message: "CV uploaded successfully.", data: cv },
      { status: 201 },
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