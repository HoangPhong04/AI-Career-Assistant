export const runtime = "nodejs";
import { Prisma } from "@/app/generated/prisma";
import { AIAnalysisError, analyzeCVWithAI } from "@/lib/ai/cv-analyzer";
import { getCurrentUser } from "@/lib/auth";
import { CVParserError, extractTextFormFile } from "@/lib/cv/cv-parser";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return apiError(401, "UNAUTHENTICATED", "Please sign in to continue");

  const { searchParams } = new URL(request.url);
  const cvId = searchParams.get("cvId");
  try {
    const whereCondition = cvId
      ? { id: cvId, userId: user.id }
      : { userId: user.id, status: "ANALYZED" };
    const cv = await prisma.cV.findFirst({
      where: whereCondition,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        originalName: true,
        status: true,
        score: true,
        extractedText: true,
        analysisJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!cv) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: cv });
  } catch (error: unknown) {
    console.error("GET CV error:", error);
    return apiError(500, "INTERNAL_ERROR", "Failed to retrieve CV data.");
  }
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return apiError(401, "UNAUTHENTICATED", "Please sign in to continue");
  }

  let cvId: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    cvId = body.cvId;
    if (!cvId) {
      return NextResponse.json(
        { message: "Missing required field 'cvId'.", code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    const cv = await prisma.cV.findFirst({
      where: { id: cvId, userId: currentUser.id },
    });
    if (!cv) {
      return NextResponse.json(
        { message: "CV not found with the provided ID.", code: "CV_NOT_FOUND" },
        { status: 404 }
      );
    }

    // ── Bước 1: Parse text từ S3 ─────────────────────────────────────────────
    let cleanText = "";
    try {
      cleanText = await extractTextFormFile(cv.filePath);
    } catch (parseError) {
      await prisma.cV.update({
        where: { id: cvId },
        data: { status: "FAILED" },
      });
      if (parseError instanceof CVParserError) {
        return NextResponse.json(
          { message: parseError.message, code: parseError.code },
          { status: 422 }
        );
      }
      throw parseError;
    }

    await prisma.cV.update({
      where: { id: cvId },
      data: { extractedText: cleanText, status: "PARSED" },
    });

    // ── Bước 2: Gọi AI phân tích ─────────────────────────────────────────────
    let analysisResult: Awaited<ReturnType<typeof analyzeCVWithAI>>;
    try {
      analysisResult = await analyzeCVWithAI(cleanText);
    } catch (aiError) {
      await prisma.cV.update({
        where: { id: cvId },
        data: { status: "FAILED" },
      });
      if (aiError instanceof AIAnalysisError) {
        return NextResponse.json(
          { message: aiError.message, code: aiError.code },
          { status: 502 }
        );
      }
      throw aiError;
    }

    // ── Bước 3: Lưu kết quả phân tích ───────────────────────────────────────
    const updatedCV = await prisma.cV.update({
      where: { id: cvId },
      data: {
        analysisJson: analysisResult as Prisma.InputJsonValue,
        score: analysisResult.score,
        status: "ANALYZED",
      },
      select: {
        id: true,
        originalName: true,
        status: true,
        score: true,
        extractedText: true,
        analysisJson: true,
        updatedAt: true,
      },
    });

    // ── Bước 4: Lưu Skills vào DB (batch transaction, có category) ───────────
    // Gộp technical + soft kèm theo category tương ứng
    const skillsWithCategory: { name: string; category: "technical" | "soft" }[] = [
      ...analysisResult.skills.technical.map((name) => ({
        name,
        category: "technical" as const,
      })),
      ...analysisResult.skills.soft.map((name) => ({
        name,
        category: "soft" as const,
      })),
    ];

    if (skillsWithCategory.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const { name: skillName, category } of skillsWithCategory) {
          // Tìm skill theo tên (không phân biệt hoa thường)
          let skill = await tx.skill.findFirst({
            where: { name: { equals: skillName, mode: "insensitive" } },
          });

          // Nếu chưa có thì tạo mới — kèm category
          if (!skill) {
            skill = await tx.skill.create({
              data: { name: skillName, category },
            });
          }

          // Tạo liên kết CVSkill — bỏ qua nếu đã tồn tại (unique constraint)
          await tx.cVSkill
            .create({
              data: { cvId: cv.id, skillId: skill.id },
            })
            .catch(() => null);
        }
      });
    }

    return NextResponse.json({
      message: "CV parsed and analyzed successfully.",
      data: updatedCV,
    });
  } catch (error: unknown) {
    console.error("CV analyze pipeline error:", error);

    if (cvId) {
      await prisma.cV
        .update({
          where: { id: cvId },
          data: { status: "FAILED" },
        })
        .catch(() => null);
    }

    return NextResponse.json(
      {
        message: "An unexpected error occurred during CV analysis.",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
