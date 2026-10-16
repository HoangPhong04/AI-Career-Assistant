import { AIAnalysisError, analyzeCVWithAI } from "@/lib/ai/cv-analyzer";
import { CVParserError, extractTextFormFile } from "@/lib/cv/cv-parser";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
export async function POST(request: Request) {
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
    const cv = await prisma.cV.findUnique({
      where: { id: cvId },
    });
    if (!cv) {
      return NextResponse.json(
        { message: "CV not found with the provided ID.", code: "CV_NOT_FOUND" },
        { status: 404 }
      );
    }
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
      data: {
        extractedText: cleanText,
        status: "PARSED",
      },
    });
    let analysisResult;
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
    const updatedCV = await prisma.cV.update({
      where: { id: cvId },
      data: {
        analysisJson: analysisResult as any,
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
