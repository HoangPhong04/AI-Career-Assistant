/**
 * GET /api/career/cv-skills
 *
 * Lists the user's analysed CVs together with the skills resolved from the
 * normalised `skill` ⨝ `cv_skill` tables. The Career UI uses this to let the
 * user pick which scanned CV feeds the skill-gap analysis, and to preview the
 * skills that will be sent to the AI.
 */
import { getCurrentUser } from "@/lib/auth";
import { listCvsWithSkills } from "@/lib/career/skill-repository";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.");

  try {
    const cvs = await listCvsWithSkills(user.id);
    // Only CVs that are analysed and actually carry skills are selectable.
    return apiSuccess(
      cvs.filter(
        (cv) =>
          cv.status === "ANALYZED" &&
          (cv.skills.technical.length > 0 || cv.skills.soft.length > 0)
      )
    );
  } catch (error) {
    console.error("[career/cv-skills] Failed to list CV skills:", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể lấy danh sách kỹ năng từ CV.");
  }
}
