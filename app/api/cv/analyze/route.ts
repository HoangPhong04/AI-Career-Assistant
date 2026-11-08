import { Prisma } from "@/app/generated/prisma";
import { AIAnalysisError, analyzeCVWithAI } from "@/lib/ai/cv-analyzer";
import { getCurrentUser } from "@/lib/auth";
import { CVParserError, extractTextFormFile } from "@/lib/cv/cv-parser";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
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

    // Trả dữ liệu về cho component hiển thị
    return apiSuccess(cv);
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
      return apiError(400, "INVALID_REQUEST", "Missing required field 'cvId'.");
    }
    const cv = await prisma.cV.findFirst({
      where: { id: cvId, userId: currentUser.id },
    });
    if (!cv) {
      return apiError(404, "CV_NOT_FOUND", "CV not found or does not belong to you.");
    }
    let cleanText = "";
    try {
      cleanText = await extractTextFormFile(cv.filePath);
    } catch (parseError) {
      await prisma.cV.updateMany({
        where: { id: cvId, userId: currentUser.id },
        data: { status: "FAILED" },
      });
      if (parseError instanceof CVParserError) {
        return apiError(422, parseError.code, parseError.message);
      }
      throw parseError;
    }
    await prisma.cV.updateMany({
      where: { id: cvId, userId: currentUser.id },
      data: {
        extractedText: cleanText,
        status: "PARSED",
      },
    });
    let analysisResult: Awaited<ReturnType<typeof analyzeCVWithAI>>;
    try {
      analysisResult = await analyzeCVWithAI(cleanText);
    } catch (aiError) {
      await prisma.cV.updateMany({
        where: { id: cvId, userId: currentUser.id },
        data: { status: "FAILED" },
      });
      if (aiError instanceof AIAnalysisError) {
        return apiError(502, aiError.code, aiError.message);
      }
      throw aiError;
    }
    await prisma.cV.updateMany({
      where: { id: cvId, userId: currentUser.id },
      data: {
        analysisJson: analysisResult as Prisma.InputJsonValue,
        score: analysisResult.score,
        status: "ANALYZED",
      },
    });
    const updatedCV = await prisma.cV.findFirst({
      where: { id: cvId, userId: currentUser.id },
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
    if (!updatedCV)
      return apiError(404, "CV_NOT_FOUND", "CV not found or does not belong to you.");
    const allSkillNames = [
      ...analysisResult.skills.technical,
      ...analysisResult.skills.soft,
    ];

    for (const skillName of allSkillNames) {
      // Tìm hoặc tạo skill trong bảng Skill
      let skill = await prisma.skill.findFirst({
        where: { name: { equals: skillName, mode: "insensitive" } },
      });

      if (!skill) {
        skill = await prisma.skill.create({
          data: { name: skillName },
        });
      }

      // Tạo liên kết trong cv_skill
      await prisma.cVSkill
        .create({
          data: {
            cvId: cv.id,
            skillId: skill.id,
          },
        })
        .catch(() => null); // Bỏ qua nếu đã tồn tại
    }
    return apiSuccess(updatedCV);
  } catch (error: unknown) {
    console.error("CV analyze pipeline error:", error);

    if (cvId) {
      await prisma.cV
        .updateMany({
          where: { id: cvId, userId: currentUser.id },
          data: { status: "FAILED" },
        })
        .catch(() => null);
    }

    return apiError(
      500,
      "INTERNAL_ERROR",
      "An unexpected error occurred during CV analysis."
    );
  }
}
