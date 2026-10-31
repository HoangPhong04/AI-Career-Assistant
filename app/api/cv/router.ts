import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return apiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.");
  }

  try {
    const cvHistory = await prisma.cV.findMany({
      where: {
        userId: currentUser.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        originalName: true,
        fileType: true,
        status: true,
        score: true,
        createdAt: true,
        analysisJson: true,
      },
    });

    return NextResponse.json({
      data: cvHistory,
    });
  } catch (error) {
    console.error("Fetch CV history error:", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể lấy lịch sử CV.");
  }
}
