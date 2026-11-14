export const CAREER_LEVEL_LABEL: Record<string, string> = {
  fresher: "Mới ra trường (0-1 năm)",
  junior: "Junior (1-2 năm)",
  mid: "Mid (2-5 năm)",
  senior: "Senior (5-8 năm)",
  lead: "Lead / Trưởng nhóm (8+ năm)",
};

export const ROADMAP_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  ARCHIVED: "Đã lưu trữ",
  PENDING: "Chưa bắt đầu",
};

export const RESOURCE_TYPE_LABEL: Record<string, string> = {
  course: "Khóa học",
  book: "Sách",
  article: "Bài viết",
  project: "Dự án",
  certification: "Chứng chỉ",
};

export const IMPORTANCE_LABEL: Record<string, string> = {
  "must-have": "Bắt buộc",
  "nice-to-have": "Nên có",
};

export function careerLevelLabel(level: string): string {
  return CAREER_LEVEL_LABEL[level] ?? level;
}

export function roadmapStatusLabel(status: string): string {
  return ROADMAP_STATUS_LABEL[status] ?? status;
}

export function resourceTypeLabel(type: string): string {
  return RESOURCE_TYPE_LABEL[type] ?? type;
}
