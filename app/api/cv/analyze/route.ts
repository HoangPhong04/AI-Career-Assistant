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

// export async function POST(request: Request) {
//   const currentUser = await getCurrentUser();
//   if (!currentUser) {
//     return apiError(401, "UNAUTHENTICATED", "Please sign in to continue");
//   }

//   let cvId: string | undefined;
//   try {
//     const body = await request.json().catch(() => ({}));
//     cvId = body.cvId;
//     if (!cvId) {
//       return apiError(400, "INVALID_REQUEST", "Missing required field 'cvId'.");
//     }
//     const cv = await prisma.cV.findFirst({
//       where: { id: cvId, userId: currentUser.id },
//     });
//     if (!cv) {
//       return apiError(
//         404,
//         "CV_NOT_FOUND",
//         "CV not found or does not belong to you."
//       );
//     }
//     let cleanText = "";
//     try {
//       cleanText = await extractTextFormFile(cv.filePath);
//     } catch (parseError) {
//       await prisma.cV.updateMany({
//         where: { id: cvId, userId: currentUser.id },
//         data: { status: "FAILED" },
//       });
//       if (parseError instanceof CVParserError) {
//         return apiError(422, parseError.code, parseError.message);
//       }
//       throw parseError;
//     }
//     await prisma.cV.updateMany({
//       where: { id: cvId, userId: currentUser.id },
//       data: {
//         extractedText: cleanText,
//         status: "PARSED",
//       },
//     });
//     let analysisResult: Awaited<ReturnType<typeof analyzeCVWithAI>>;
//     try {
//       analysisResult = await analyzeCVWithAI(cleanText);
//     } catch (aiError) {
//       await prisma.cV.updateMany({
//         where: { id: cvId, userId: currentUser.id },
//         data: { status: "FAILED" },
//       });
//       if (aiError instanceof AIAnalysisError) {
//         return apiError(502, aiError.code, aiError.message);
//       }
//       throw aiError;
//     }
//     await prisma.cV.updateMany({
//       where: { id: cvId, userId: currentUser.id },
//       data: {
//         analysisJson: analysisResult as Prisma.InputJsonValue,
//         score: analysisResult.score,
//         status: "ANALYZED",
//       },
//     });
//     const updatedCV = await prisma.cV.findFirst({
//       where: { id: cvId, userId: currentUser.id },
//       select: {
//         id: true,
//         originalName: true,
//         status: true,
//         score: true,
//         extractedText: true,
//         analysisJson: true,
//         updatedAt: true,
//       },
//     });
//     if (!updatedCV)
//       return apiError(
//         404,
//         "CV_NOT_FOUND",
//         "CV not found or does not belong to you."
//       );
//     const allSkillNames = [
//       ...analysisResult.skills.technical,
//       ...analysisResult.skills.soft,
//     ];

//     for (const skillName of allSkillNames) {
//       // Tìm hoặc tạo skill trong bảng Skill
//       let skill = await prisma.skill.findFirst({
//         where: { name: { equals: skillName, mode: "insensitive" } },
//       });

//       if (!skill) {
//         skill = await prisma.skill.create({
//           data: { name: skillName },
//         });
//       }

//       // Tạo liên kết trong cv_skill
//       await prisma.cVSkill
//         .create({
//           data: {
//             cvId: cv.id,
//             skillId: skill.id,
//           },
//         })
//         .catch(() => null); // Bỏ qua nếu đã tồn tại
//     }
//     return apiSuccess(updatedCV);
//   } catch (error: unknown) {
//     console.error("CV analyze pipeline error:", error);

//     if (cvId) {
//       await prisma.cV
//         .updateMany({
//           where: { id: cvId, userId: currentUser.id },
//           data: { status: "FAILED" },
//         })
//         .catch(() => null);
//     }

//     return apiError(
//       500,
//       "INTERNAL_ERROR",
//       "An unexpected error occurred during CV analysis."
//     );
//   }
import {
  mapEducations,
  mapExperiences,
  mapProjects,
} from "@/lib/cv/profile-mapper";

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
      return apiError(
        404,
        "CV_NOT_FOUND",
        "CV not found or does not belong to you."
      );
    }

    // 1. Parse file
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
      data: { extractedText: cleanText, status: "PARSED" },
    });

    // 2. AI analyze
    let analysisResult: Awaited<ReturnType<typeof analyzeCVWithAI>>;
    try {
      analysisResult = await analyzeCVWithAI(cleanText);
    } catch (aiError) {
      await prisma.cV.updateMany({
        where: { id: cvId, userId: currentUser.id },
        data: { status: "FAILED" },
      });
      if (aiError instanceof AIAnalysisError) {
        // Quota exhaustion is a rate limit, not an upstream failure.
        if (aiError.code === "AI_QUOTA_EXCEEDED") {
          return apiError(429, aiError.code, aiError.message);
        }

        return apiError(502, aiError.code, aiError.message);
      }
      throw aiError;
    }

    // 3. Chuẩn bị dữ liệu
    const raw = analysisResult as unknown as Record<string, unknown>;

    // Skills are split by category so the `skill` table can distinguish
    // technical from soft skills for the Career Roadmap module.
    // The first spelling of a duplicated skill wins.
    const collectNames = (values: unknown): string[] => {
      if (!Array.isArray(values)) return [];

      const seen = new Map<string, string>();
      for (const entry of values) {
        if (typeof entry !== "string") continue;
        const name = entry.trim().slice(0, 100);
        if (!name) continue;

        const key = name.toLowerCase();
        if (!seen.has(key)) seen.set(key, name);
      }
      return Array.from(seen.values());
    };

    const technicalNames = collectNames(analysisResult.skills?.technical);
    const softNames = collectNames(analysisResult.skills?.soft);

    // A skill can appear in both lists; technical wins as the primary bucket.
    const technicalLookup = new Set(technicalNames.map((s) => s.toLowerCase()));
    const skillNames = Array.from(
      new Map(
        [
          ...technicalNames,
          ...softNames.filter((s) => !technicalLookup.has(s.toLowerCase())),
        ].map((s) => [s.toLowerCase(), s] as const)
      ).values()
    );

    const categoryByName = new Map<string, string>();
    for (const name of technicalNames) categoryByName.set(name.toLowerCase(), "technical");
    for (const name of softNames) {
      if (!categoryByName.has(name.toLowerCase())) {
        categoryByName.set(name.toLowerCase(), "soft");
      }
    }

    const educations = mapEducations(raw.education, currentUser.id, cv.id);
    const experiences = mapExperiences(
      raw.experience ?? raw.experiences ?? raw.workExperience,
      currentUser.id,
      cv.id
    );
    const projects = mapProjects(raw.projects, currentUser.id, cv.id);

    // 4. Lưu tất cả trong một transaction
    await prisma.$transaction(
      async (tx) => {
        // 4.1 Skills
        await tx.cVSkill.deleteMany({ where: { cvId: cv.id } });

        const skillIds: string[] = [];
        for (const name of skillNames) {
          const category = categoryByName.get(name.toLowerCase()) ?? "technical";
          let skill = await tx.skill.findFirst({
            where: { name: { equals: name, mode: "insensitive" } },
          });
          if (!skill) {
            skill = await tx.skill.create({ data: { name, category } });
          } else if (skill.category !== category) {
            // Keep the category in sync so the Career module can tell
            // technical and soft skills apart.
            skill = await tx.skill.update({
              where: { id: skill.id },
              data: { category },
            });
          }
          skillIds.push(skill.id);
        }
        if (skillIds.length) {
          await tx.cVSkill.createMany({
            data: skillIds.map((skillId) => ({ cvId: cv.id, skillId })),
          });
        }

        // 4.2 Xóa dữ liệu sinh từ lần phân tích trước của CV này
        const scope = { cvId: cv.id, userId: currentUser.id };
        await tx.education.deleteMany({ where: scope });
        await tx.experience.deleteMany({ where: scope });
        await tx.project.deleteMany({ where: scope });

        // 4.3 Ghi dữ liệu mới
        if (educations.length)
          await tx.education.createMany({ data: educations });
        if (experiences.length)
          await tx.experience.createMany({ data: experiences });
        if (projects.length) await tx.project.createMany({ data: projects });

        // 4.4 Cuối cùng mới đánh dấu ANALYZED
        await tx.cV.update({
          where: { id: cv.id },
          data: {
            analysisJson: analysisResult as Prisma.InputJsonValue,
            score: analysisResult.score,
            status: "ANALYZED",
          },
        });
      },
      { timeout: 30000, maxWait: 10000 }
    );

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
    if (!updatedCV) {
      return apiError(
        404,
        "CV_NOT_FOUND",
        "CV not found or does not belong to you."
      );
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
