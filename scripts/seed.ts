/**
 * Seed script — wipes and repopulates the database with realistic demo data.
 *
 * Usage:  npm run db:seed
 *
 * Creates:
 *   - 1 demo user      (email: demo@aicareer.com / password: Demo1234!)
 *   - 20 Skills        (technical + soft)
 *   - 1 CV             (linked to 8 skills)
 *   - 2 CareerGoals
 *   - 2 CareerRoadmaps (with 8–10 RoadmapSteps each, mixed statuses)
 *   - 3 InterviewSessions (with 5–8 InterviewQuestions each)
 *   - 2 Educations
 *   - 3 Experiences
 *   - 2 Projects
 */
import "dotenv/config";
import { PrismaClient, Prisma } from "@/app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// ─── Setup ───────────────────────────────────────────────────────────────────
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const DEMO_EMAIL = "demo@aicareer.com";
const DEMO_PASSWORD = "Demo1234!";
const DEMO_FULL_NAME = "Nguyễn Văn Demo";

// ─── Static reference data ───────────────────────────────────────────────────

const TECHNICAL_SKILLS: { name: string; category: string; description: string }[] = [
  { name: "TypeScript", category: "technical", description: "Strongly-typed JavaScript superset." },
  { name: "React", category: "technical", description: "Component-based UI library." },
  { name: "Next.js", category: "technical", description: "React framework with SSR/SSG." },
  { name: "Node.js", category: "technical", description: "Server-side JavaScript runtime." },
  { name: "PostgreSQL", category: "technical", description: "Open-source relational database." },
  { name: "Docker", category: "technical", description: "Container platform." },
  { name: "GraphQL", category: "technical", description: "Query language for APIs." },
  { name: "TailwindCSS", category: "technical", description: "Utility-first CSS framework." },
  { name: "Python", category: "technical", description: "High-level general-purpose language." },
  { name: "AWS", category: "technical", description: "Cloud computing platform." },
  { name: "Redis", category: "technical", description: "In-memory data store." },
  { name: "Kubernetes", category: "technical", description: "Container orchestration." },
  { name: "System Design", category: "technical", description: "Designing scalable distributed systems." },
  { name: "Testing (Jest/Vitest)", category: "technical", description: "Unit and integration testing." },
  { name: "CI/CD", category: "technical", description: "Continuous integration and deployment." },
];

const SOFT_SKILLS = [
  { name: "Communication", category: "soft", description: "Clear, concise written and verbal exchange." },
  { name: "Teamwork", category: "soft", description: "Collaborative mindset in cross-functional work." },
  { name: "Problem Solving", category: "soft", description: "Decomposing issues into shippable solutions." },
  { name: "Leadership", category: "soft", description: "Mentoring and aligning team efforts." },
  { name: "Time Management", category: "soft", description: "Prioritising high-impact work." },
];

// 8 skills for the demo CV — middling level coverage
const CV_TECHNICAL_PICKS = [
  "TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "Docker", "TailwindCSS",
];
const CV_SOFT_PICKS = ["Communication", "Problem Solving"];

const TARGET_ROLES: { role: string; level: "fresher" | "junior" | "mid" | "senior" | "lead" }[] = [
  { role: "Senior Frontend Developer", level: "mid" },
  { role: "Fullstack Engineer", level: "mid" },
];

// ─── Roadmap templates ──────────────────────────────────────────────────────

type StepTemplate = {
  title: string;
  description: string;
  estimatedDays: number;
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
};

type PhaseTemplate = {
  phase: string;
  goals: string[];
  steps: StepTemplate[];
};

function buildRoadmapPhases(targetRole: string): {
  estimatedMonths: number;
  totalEstimatedDays: number;
  phases: PhaseTemplate[];
  careerAdvice: { immediate: string[]; shortTerm: string[]; longTerm: string[] };
  skillGap: {
    gapSkills: { skill: string; category: "technical" | "soft"; importance: "must-have" | "nice-to-have"; reason: string }[];
    matchedSkills: string[];
    overallGapScore: number;
    gapSummary: string;
  };
} {
  return {
    estimatedMonths: 6,
    totalEstimatedDays: 180,
    phases: [
      {
        phase: "Phase 1: Foundation (Tháng 1–2)",
        goals: [
          "Củng cố nền tảng kỹ thuật cốt lõi cho vị trí mục tiêu",
          "Xây dựng 1 dự án portfolio quy mô nhỏ",
        ],
        steps: [
          {
            title: `Đánh giá skill gap cho vai trò ${targetRole}`,
            description:
              "Chạy tool phân tích AI để xác định kỹ năng còn thiếu và lên kế hoạch ưu tiên.",
            estimatedDays: 3,
            status: "COMPLETED",
          },
          {
            title: "Hoàn thiện portfolio hiện có",
            description: "Cập nhật README, demo video, viết case study ngắn cho từng dự án.",
            estimatedDays: 7,
            status: "IN_PROGRESS",
          },
          {
            title: "Ôn lại System Design cơ bản",
            description: "Đọc 2 cuốn sách / xem 1 khóa học về thiết kế hệ thống scalable.",
            estimatedDays: 14,
          },
          {
            title: "Viết CV theo định dạng FAANG-friendly",
            description: "Sử dụng mẫu có sẵn, bám sát JD của vị trí mục tiêu.",
            estimatedDays: 4,
            status: "COMPLETED",
          },
        ],
      },
      {
        phase: "Phase 2: Deepen Skills (Tháng 2–4)",
        goals: [
          "Lấp đầy các kỹ năng 'must-have' còn thiếu",
          "Hoàn thành ít nhất 1 chứng chỉ / khóa học chuyên sâu",
        ],
        steps: [
          {
            title: "Hoàn thành khóa học chuyên sâu",
            description: "Chọn 1 khóa học trên Coursera/Udemy, đặt mục tiêu hoàn thành trong 6 tuần.",
            estimatedDays: 42,
          },
          {
            title: "Đóng góp vào open-source",
            description: "Submit ít nhất 3 PR vào các repo vừa sức (good-first-issue).",
            estimatedDays: 30,
            status: "IN_PROGRESS",
          },
          {
            title: "Xây dựng dự án capstone",
            description:
              "Một dự án end-to-end minh họa đầy đủ kỹ năng cho vị trí mục tiêu, deploy lên cloud.",
            estimatedDays: 45,
          },
        ],
      },
      {
        phase: "Phase 3: Job Hunt (Tháng 4–6)",
        goals: [
          "Apply 30–50 vị trí có chất lượng",
          "Đạt ít nhất 5 vòng phỏng vấn onsite / on-site",
        ],
        steps: [
          {
            title: "Tạo hồ sơ LinkedIn tối ưu",
            description: "Tối ưu headline, about, thêm 5 skill được recommend.",
            estimatedDays: 2,
          },
          {
            title: "Luyện phỏng vấn 4 buổi/tuần",
            description: "Mỗi buổi: 1 behavioral + 1 technical + 1 system design.",
            estimatedDays: 60,
          },
          {
            title: "Network với 20 người trong ngành",
            description: "Gửi 20 connection request + follow-up chân thành.",
            estimatedDays: 30,
          },
        ],
      },
    ],
    careerAdvice: {
      immediate: [
        "Cập nhật LinkedIn với headline mới",
        "Hoàn thành 1 bài blog chia sẻ kiến thức",
      ],
      shortTerm: [
        "Tham gia 2 cộng đồng nghề nghiệp",
        "Đạt ít nhất 1 chứng chỉ trong 6 tháng",
      ],
      longTerm: [
        "Xây dựng thương hiệu cá nhân trong 1 niche",
        "Đặt mục tiêu vị trí Staff / Lead trong 3 năm tới",
      ],
    },
    skillGap: {
      gapSkills: [
        {
          skill: "GraphQL",
          category: "technical",
          importance: "must-have",
          reason: "Hầu hết JD Senior Frontend / Fullstack ở VN hiện yêu cầu GraphQL.",
        },
        {
          skill: "System Design",
          category: "technical",
          importance: "must-have",
          reason: "Phỏng vấn vòng onsite thường có 1 vòng system design 45–60 phút.",
        },
        {
          skill: "AWS",
          category: "technical",
          importance: "nice-to-have",
          reason: "Cloud literacy giúp trả lời tốt các câu deployment/scaling.",
        },
        {
          skill: "Leadership",
          category: "soft",
          importance: "nice-to-have",
          reason: "Bắt buộc cho vòng senior trở lên — thể hiện qua mentoring và project lead.",
        },
      ],
      matchedSkills: CV_TECHNICAL_PICKS,
      overallGapScore: 38,
      gapSummary:
        "Nền tảng vững, cần bù GraphQL + System Design để sẵn sàng cho vòng phỏng vấn senior.",
    },
  };
}

// ─── Interview templates ─────────────────────────────────────────────────────

type InterviewQuestionTemplate = {
  type: string;
  text: string;
  answer?: string;
  feedback?: string;
  score?: number;
};

const INTERVIEW_TEMPLATES: {
  position: string;
  level: string;
  type: string;
  status: string;
  score?: number;
  questions: InterviewQuestionTemplate[];
}[] = [
  {
    position: "Senior Frontend Developer",
    level: "senior",
    type: "MIXED",
    status: "COMPLETED",
    score: 7.5,
    questions: [
      {
        type: "BEHAVIORAL",
        text: "Tell me about a time you disagreed with a teammate on a technical decision.",
        answer:
          "I once pushed back on using a custom state management library when Redux Toolkit would suffice. We aligned by prototyping both and presenting benchmarks.",
        feedback:
          "Good structure (STAR). Showed data-driven reasoning. Could elaborate more on the outcome metrics.",
        score: 8.0,
      },
      {
        type: "TECHNICAL",
        text: "Explain the difference between Server Components and Client Components in Next.js.",
        answer:
          "Server Components render on the server, can fetch data directly, and ship zero JS to the client. Client Components hydrate on the client and are required for interactivity.",
        feedback: "Accurate and concise. Solid answer.",
        score: 9.0,
      },
      {
        type: "TECHNICAL",
        text: "How would you debounce a search input in React?",
        answer:
          "I'd use a custom hook with useEffect and setTimeout, or lodash.debounce. Cleanup the timer on unmount.",
        feedback: "Correct. Mentioning cleanup is a plus.",
        score: 8.5,
      },
      {
        type: "SYSTEM_DESIGN",
        text: "Design a real-time collaborative editor (e.g. Google Docs).",
        answer:
          "Need a CRDT (e.g. Yjs) for conflict resolution, WebSocket for transport, and operational transform for server-side reconciliation.",
        feedback:
          "Good top-level coverage. Could deepen on consistency model and offline support.",
        score: 7.0,
      },
      {
        type: "BEHAVIORAL",
        text: "Describe a time you mentored a junior developer.",
        answer:
          "I paired with a junior for 2 weeks, set up weekly 1-on-1s, and reviewed their PRs with constructive feedback.",
        feedback: "Solid leadership signal. Add measurable outcomes next time.",
        score: 7.0,
      },
    ],
  },
  {
    position: "Senior Frontend Developer",
    level: "senior",
    type: "TECHNICAL",
    status: "COMPLETED",
    score: 6.5,
    questions: [
      {
        type: "TECHNICAL",
        text: "What is the virtual DOM and how does reconciliation work?",
        answer: "VDOM is a JS representation of the UI; reconciliation diffs old and new trees.",
        feedback: "Good intro. Could expand on key heuristics.",
        score: 7.5,
      },
      {
        type: "TECHNICAL",
        text: "Explain React's useEffect dependency array rules.",
        answer: "Pass the values the effect depends on. Omit only when intentionally using a fresh closure.",
        feedback: "Mostly correct. Missing lint rule discussion.",
        score: 6.5,
      },
      {
        type: "TECHNICAL",
        text: "What are the tradeoffs between CSS-in-JS and Tailwind?",
        answer:
          "CSS-in-JS offers scoped styles and dynamic theming but adds runtime cost. Tailwind is fast, zero-runtime, but verbose in markup.",
        feedback: "Balanced answer.",
        score: 7.0,
      },
    ],
  },
  {
    position: "Fullstack Engineer",
    level: "mid",
    type: "MIXED",
    status: "CREATED",
    questions: [
      { type: "BEHAVIORAL", text: "Tell me about a production bug you fixed under pressure." },
      { type: "TECHNICAL", text: "How do you design idempotent APIs?" },
      { type: "SYSTEM_DESIGN", text: "Sketch an URL shortener." },
      { type: "TECHNICAL", text: "Walk me through your CI/CD pipeline." },
      { type: "BEHAVIORAL", text: "Describe your ideal code review process." },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickSkills(allSkills: { id: string; name: string }[], names: string[]) {
  return names
    .map((n) => allSkills.find((s) => s.name === n)?.id)
    .filter((id): id is string => Boolean(id));
}

async function clearDatabase(): Promise<void> {
  console.log("🧹  Clearing existing data…");
  // Order matters because of FKs
  await prisma.interviewQuestion.deleteMany();
  await prisma.interviewSession.deleteMany();
  await prisma.roadmapStep.deleteMany();
  await prisma.careerRoadmap.deleteMany();
  await prisma.careerGoal.deleteMany();
  await prisma.cVSkill.deleteMany();
  await prisma.cV.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.project.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.education.deleteMany();
  await prisma.user.deleteMany();
}

async function upsertSkills() {
  console.log("📚  Upserting skills…");
  const all = [...TECHNICAL_SKILLS, ...SOFT_SKILLS];
  const created: { id: string; name: string }[] = [];

  for (const skill of all) {
    const existing = await prisma.skill.findFirst({
      where: { name: skill.name },
      select: { id: true, name: true },
    });

    const row = existing
      ? await prisma.skill.update({
          where: { id: existing.id },
          data: { category: skill.category, description: skill.description },
          select: { id: true, name: true },
        })
      : await prisma.skill.create({
          data: skill,
          select: { id: true, name: true },
        });

    created.push(row);
  }

  console.log(`   ✓ ${created.length} skills`);
  return created;
}

async function createUser() {
  console.log("👤  Creating demo user…");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash,
      fullName: DEMO_FULL_NAME,
      role: "user",
      avatarUrl: null,
    },
    select: { id: true, email: true },
  });

  console.log(`   ✓ ${user.email} (${user.id})`);
  return user;
}

async function createProfile(userId: string) {
  console.log("📝  Seeding profile (education / experience / projects)…");

  await prisma.education.createMany({
    data: [
      {
        userId,
        schoolName: "Đại học Bách khoa Hà Nội",
        degree: "Bachelor",
        major: "Computer Science",
        startDate: new Date("2018-09-01"),
        endDate: new Date("2022-06-30"),
        description: "GPA: 3.4/4.0. Chuyên ngành Khoa học Máy tính.",
      },
      {
        userId,
        schoolName: "Coursera",
        degree: "Professional Certificate",
        major: "Fullstack Web Development",
        startDate: new Date("2023-01-15"),
        endDate: new Date("2023-07-15"),
        description: "Meta Front-End / Back-End Professional Certificates.",
      },
    ],
  });

  await prisma.experience.createMany({
    data: [
      {
        userId,
        companyName: "FPT Software",
        position: "Frontend Developer",
        startDate: new Date("2022-07-01"),
        endDate: new Date("2024-01-31"),
        description:
          "Xây dựng dashboard quản lý bằng React + TypeScript. Code review và onboarding cho 3 juniors.",
        isCurrent: false,
      },
      {
        userId,
        companyName: "VNG Corporation",
        position: "Mid-level Frontend Engineer",
        startDate: new Date("2024-02-01"),
        endDate: new Date("2025-09-30"),
        description:
          "Phát triển các tính năng ZaloPay bằng Next.js. Tối ưu Core Web Vitals, giảm 35% LCP.",
        isCurrent: false,
      },
      {
        userId,
        companyName: "Tiki",
        position: "Frontend Engineer (Senior track)",
        startDate: new Date("2025-10-01"),
        endDate: null,
        description:
          "Dẫn dắt nhóm 3 người trong dự án personalization. Đề xuất chuyển sang Server Components.",
        isCurrent: true,
      },
    ],
  });

  await prisma.project.createMany({
    data: [
      {
        userId,
        name: "Personal Finance Tracker",
        description:
          "Open-source app theo dõi chi tiêu, Next.js 15 + Prisma + PostgreSQL. Đạt 400 stars GitHub.",
        technologies: "Next.js, Prisma, PostgreSQL, TailwindCSS, Recharts",
        startDate: new Date("2024-03-01"),
        endDate: new Date("2024-09-30"),
        url: "https://github.com/demo/finance-tracker",
      },
      {
        userId,
        name: "Realtime Collaborative Whiteboard",
        description:
          "Web app vẽ chung cho team, dùng CRDT (Yjs) + WebSocket. Hỗ trợ 20 người đồng thời.",
        technologies: "React, Yjs, WebSocket, Canvas API",
        startDate: new Date("2025-02-01"),
        endDate: null,
        url: "https://github.com/demo/collab-board",
      },
    ],
  });

  console.log("   ✓ 2 educations, 3 experiences, 2 projects");
}

async function createCV(userId: string, skillIds: { id: string; name: string }[]) {
  console.log("📄  Creating demo CV…");

  const cvSkillIds: { id: string; level: string }[] = [
    ...CV_TECHNICAL_PICKS.map((name, i) => ({
      id: pickSkills(skillIds, [name])[0],
      level: i < 3 ? "ADVANCED" : i < 6 ? "INTERMEDIATE" : "BEGINNER",
    })),
    ...CV_SOFT_PICKS.map((name) => ({
      id: pickSkills(skillIds, [name])[0],
      level: "INTERMEDIATE",
    })),
  ];

  const extractedText = `
Nguyễn Văn Demo — Frontend Engineer

TÓM TẮT
Frontend Engineer với 3+ năm kinh nghiệm xây dựng ứng dụng web quy mô lớn bằng React/Next.js.

KỸ NĂNG
TypeScript, React, Next.js, Node.js, PostgreSQL, Docker, TailwindCSS, GraphQL (cơ bản).

KINH NGHIỆM
Tiki (10/2025 - Hiện tại) — Senior Frontend Engineer track.
VNG (02/2024 - 09/2025) — Mid-level Frontend Engineer, dự án ZaloPay.
FPT Software (07/2022 - 01/2024) — Frontend Developer.

DỰ ÁN
Personal Finance Tracker (open-source, 400★).
Realtime Collaborative Whiteboard (Yjs + WebSocket).
`.trim();

  const analysisJson: Prisma.InputJsonValue = {
    summary:
      "Frontend Engineer 3+ năm kinh nghiệm, mạnh về React/Next.js, đang theo track senior.",
    strengths: [
      "Thành thạo React + TypeScript",
      "Có kinh nghiệm optimization Core Web Vitals",
      "Open-source: 400+ stars trên GitHub",
    ],
    improvements: [
      "Cần nâng cấp GraphQL từ cơ bản lên production-ready",
      "Thiếu kinh nghiệm System Design cho vòng senior",
    ],
    score: 7.2,
  };

  const cv = await prisma.cV.create({
    data: {
      userId,
      originalName: "nguyen-van-demo-cv.pdf",
      filePath: "/uploads/demo/nguyen-van-demo-cv.pdf",
      fileType: "application/pdf",
      extractedText,
      status: "ANALYZED",
      analysisJson,
      score: new Prisma.Decimal("7.20"),
      skills: {
        create: cvSkillIds
          .filter((s): s is { id: string; level: string } => Boolean(s.id))
          .map((s) => ({ skillId: s.id, level: s.level })),
      },
    },
    select: { id: true, originalName: true },
  });

  console.log(`   ✓ ${cv.originalName}`);
  return cv;
}

async function createRoadmaps(
  userId: string,
  cvId: string,
  skillIds: { id: string; name: string }[]
) {
  console.log("🗺️  Creating career goals + roadmaps…");

  for (const target of TARGET_ROLES) {
    const goal = await prisma.careerGoal.create({
      data: {
        userId,
        title: `Trở thành ${target.role}`,
        description: `Mục tiêu 6 tháng: lấp gap kỹ năng để sẵn sàng cho vị trí ${target.role}.`,
        targetRole: target.role,
        targetLevel: target.level,
      },
      select: { id: true },
    });

    const payload = buildRoadmapPhases(target.role);

    const currentSkills = {
      technical: CV_TECHNICAL_PICKS,
      soft: CV_SOFT_PICKS,
    };

    const roadmap = await prisma.careerRoadmap.create({
      data: {
        userId,
        cvId,
        goalId: goal.id,
        targetRole: target.role,
        targetLevel: target.level,
        currentSkills: currentSkills as unknown as Prisma.InputJsonValue,
        missingSkills: payload.skillGap.gapSkills.map((g) => g.skill) as unknown as Prisma.InputJsonValue,
        roadmapJson: payload as unknown as Prisma.InputJsonValue,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    // Flatten phases → steps, preserving orderIndex
    const steps: Prisma.RoadmapStepCreateManyInput[] = [];
    let i = 0;
    for (const phase of payload.phases) {
      for (const step of phase.steps) {
        steps.push({
          roadmapId: roadmap.id,
          title: step.title,
          description: step.description,
          orderIndex: i,
          status: step.status ?? "PENDING",
          resources: {
            phase: phase.phase,
            estimatedDays: step.estimatedDays,
          } as unknown as Prisma.InputJsonValue,
        });
        i += 1;
      }
    }

    await prisma.roadmapStep.createMany({ data: steps });
    console.log(`   ✓ ${target.role} → ${steps.length} steps`);
  }

  // Suppress unused warning on skillIds
  void skillIds;
}

async function createInterviews(userId: string) {
  console.log("🎤  Creating interview sessions…");

  for (const template of INTERVIEW_TEMPLATES) {
    const session = await prisma.interviewSession.create({
      data: {
        userId,
        position: template.position,
        level: template.level,
        type: template.type,
        status: template.status,
        overallScore:
          template.score !== undefined ? new Prisma.Decimal(template.score.toFixed(2)) : null,
        startedAt: template.status !== "CREATED" ? new Date("2026-09-15T10:00:00Z") : null,
        endedAt:
          template.status === "COMPLETED" ? new Date("2026-09-15T10:45:00Z") : null,
      },
      select: { id: true },
    });

    await prisma.interviewQuestion.createMany({
      data: template.questions.map((q) => ({
        sessionId: session.id,
        questionText: q.text,
        questionType: q.type,
        userAnswer: q.answer ?? null,
        aiFeedback: q.feedback ?? null,
        score: q.score !== undefined ? new Prisma.Decimal(q.score.toFixed(2)) : null,
      })),
    });

    console.log(
      `   ✓ ${template.position} (${template.status}) — ${template.questions.length} câu hỏi`
    );
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding database…\n");

  await clearDatabase();

  const skills = await upsertSkills();
  const user = await createUser();
  await createProfile(user.id);
  const cv = await createCV(user.id, skills);
  await createRoadmaps(user.id, cv.id, skills);
  await createInterviews(user.id);

  console.log("\n✅  Seed completed.");
  console.log("─────────────────────────────────────────────");
  console.log(`Demo account:  ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log("─────────────────────────────────────────────");
}

main()
  .catch((err) => {
    console.error("❌  Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
