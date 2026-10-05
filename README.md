# AI Career Assistant

> Hệ thống hỗ trợ định hướng nghề nghiệp và phỏng vấn bằng AI.

## 1. Giới thiệu

**AI Career Assistant** là đồ án chuyên ngành CNTT, tập trung vào việc ứng dụng AI để hỗ trợ người dùng trong quá trình phát triển nghề nghiệp.

Hệ thống gồm 3 module chính:

- **CV Analyzer** — Upload và phân tích CV bằng AI.
- **Career Roadmap** — Phân tích Skill Gap và xây dựng lộ trình nghề nghiệp.
- **Interview Simulator** — Mô phỏng phỏng vấn, đánh giá câu trả lời và đưa feedback bằng AI.

### Luồng tổng thể

```text
CV
 ↓
AI CV Analyzer
 ↓
Skills / Experience / Strengths / Weaknesses
 ↓
Career Roadmap
 ↓
Skill Gap + Learning Plan
 ↓
Interview Simulator
 ↓
AI Evaluation
 ↓
Feedback + Report
```

## 2. Repository

GitHub:

urlAI-Career-Assistant trên GitHubhttps://github.com/HoangPhong04/AI-Career-Assistant.git

## 3. Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Zod
- AI API
- Git/GitHub

## 4. Yêu cầu môi trường

Khuyến nghị sử dụng:

- Node.js 20.19+ cho Prisma ORM 7.
- npm
- PostgreSQL 15+
- Git
- VS Code

Kiểm tra:

```bash
node -v
npm -v
git --version
```

## 5. Clone project

```bash
git clone https://github.com/HoangPhong04/AI-Career-Assistant.git
cd AI-Career-Assistant
```

## 6. Cài dependencies

```bash
npm install
```

## 7. Cấu hình Environment

Copy:

```bash
.env.example
```

thành:

```bash
.env
```

Sau đó cấu hình:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST:5432/ai_career_assistant"

AI_PROVIDER="openai"
OPENAI_API_KEY="your-api-key"
OPENAI_MODEL="gpt-4.1-mini"

AUTH_SECRET="your-random-secret"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Không commit `.env` lên GitHub.**

## 8. Setup PostgreSQL

Tạo database:

```sql
CREATE DATABASE ai_career_assistant;
```

Sau đó sửa `DATABASE_URL` trong `.env`.

Ví dụ local PostgreSQL:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/ai_career_assistant"
```

Không copy nguyên ví dụ trên nếu username/password/database của máy bạn khác.

## 9. Setup Prisma

Generate Prisma Client:

```bash
npm run db:generate
```

Đẩy schema lên database trong quá trình development:

```bash
npm run db:push
```

Hoặc sử dụng migration:

```bash
npm run db:migrate
```

Kiểm tra database:

```bash
npm run db:test
```

Mở Prisma Studio:

```bash
npm run db:studio
```

Prisma sẽ cung cấp giao diện để xem và quản lý dữ liệu trong database.

## 10. Chạy project

Development:

```bash
npm run dev
```

Mở:

```text
http://localhost:3000
```

## 11. Build production

Kiểm tra lint:

```bash
npm run lint
```

Build:

```bash
npm run build
```

Chạy production:

```bash
npm run start
```

## 12. Database workflow cho team

Khi thay đổi `prisma/schema.prisma`:

### Development

```bash
npm run db:migrate
```

Đặt tên migration rõ ràng, ví dụ:

```text
add_cv_analysis
add_interview_feedback
add_career_roadmap
```

Sau đó commit cả migration vào Git:

```bash
git add prisma/
git commit -m "feat: update database schema"
```

### Không nên

Không tự ý xóa hoặc sửa migration đã được team sử dụng trên database chung.

## 13. Cấu trúc thư mục

```text
AI-Career-Assistant/
│
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   │
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── cv/
│   │   ├── career/
│   │   ├── interview/
│   │   └── profile/
│   │
│   ├── api/
│   │   ├── auth/
│   │   ├── cv/
│   │   ├── career/
│   │   ├── interview/
│   │   └── health/
│   │
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── auth/
│   ├── cv/
│   ├── career/
│   ├── interview/
│   └── common/
│
├── lib/
│   ├── ai/
│   ├── auth/
│   ├── cv/
│   ├── career/
│   ├── interview/
│   ├── validators/
│   └── utils/
│
├── prisma/
│   └── schema.prisma
│
├── public/
│   ├── icons/
│   └── images/
│
├── types/
├── config/
├── scripts/
├── tests/
│   ├── unit/
│   └── integration/
│
├── uploads/
│   └── .gitkeep
│
├── docs/
├── .env.example
├── .gitignore
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── plan.md
├── prisma.config.ts
├── README.md
└── tsconfig.json
```

## 14. Quy ước code

### Naming

Component:

```text
CVAnalyzer.tsx
InterviewSession.tsx
CareerRoadmap.tsx
```

Function:

```text
analyzeCV()
generateRoadmap()
evaluateAnswer()
```

API:

```text
POST /api/cv/analyze
POST /api/career/roadmap
POST /api/interview/evaluate
```

### Tách trách nhiệm

Không đặt toàn bộ logic AI/database trong component UI.

Nên:

```text
UI
 ↓
API / Server Action
 ↓
Service
 ↓
AI / Prisma
```

## 15. Git workflow

Không code trực tiếp trên `main`.

Tạo branch theo feature:

```bash
git checkout -b feature/cv-analyzer
```

Ví dụ:

```text
feature/auth
feature/cv-analyzer
feature/career-roadmap
feature/interview
feature/admin
```

Commit:

```bash
git add .
git commit -m "feat: add CV upload"
```

Push:

```bash
git push -u origin feature/cv-analyzer
```

Sau đó tạo Pull Request vào branch chính mà nhóm thống nhất.

## 16. Commit convention

Sử dụng:

```text
feat: chức năng mới
fix: sửa lỗi
refactor: refactor code
docs: cập nhật tài liệu
test: thêm test
chore: cấu hình/tooling
style: thay đổi format/style
```

Ví dụ:

```bash
git commit -m "feat: add CV analysis API"
git commit -m "fix: handle invalid CV file"
git commit -m "docs: update database setup"
```

## 17. AI Integration

AI được sử dụng ở các nghiệp vụ:

### CV Analyzer

```text
CV Text
 ↓
Prompt + Structured Schema
 ↓
AI
 ↓
CV Analysis JSON
```

### Career Roadmap

```text
CV Analysis
+
Target Role
+
Current Level
 ↓
AI
 ↓
Skill Gap
+
Career Roadmap
```

### Interview

```text
Target Role
+
Difficulty
+
CV/Skills
 ↓
AI
 ↓
Question
 ↓
User Answer
 ↓
AI
 ↓
Score + Feedback
```

## 18. Nguyên tắc bảo mật AI

- Không đưa API key vào source code.
- Không commit `.env`.
- Không gửi dữ liệu không cần thiết cho AI.
- Validate dữ liệu trước khi gửi AI.
- Giới hạn kích thước file.
- Không tin tưởng trực tiếp output của AI; cần validate schema.
- Xử lý timeout/rate limit/API error.

## 19. Build checklist

Trước khi Pull Request:

```bash
npm install
npm run db:generate
npm run db:test
npm run lint
npm run build
```

Checklist:

- [ ] Code chạy local.
- [ ] Database hoạt động.
- [ ] Không có API key trong source.
- [ ] Không commit `.env`.
- [ ] Không có lỗi TypeScript.
- [ ] Lint pass.
- [ ] Build pass.
- [ ] API có xử lý lỗi.
- [ ] UI có loading/error state.

## 20. Deployment

Kiến trúc dự kiến:

```text
GitHub
   ↓
Vercel
   ↓
Next.js Application
   ↓
PostgreSQL
   ↓
AI API
```

Khi deploy cần cấu hình Environment Variables trên hosting thay vì commit `.env`.

## 21. Tài liệu dự án

- `plan.md`: kế hoạch và phạm vi dự án.
- `README.md`: hướng dẫn setup và development.
- `prisma/schema.prisma`: database schema.
- `docs/`: tài liệu kỹ thuật bổ sung.

## 22. Trạng thái dự án

> Đây là skeleton/initial setup. Các module nghiệp vụ sẽ được phát triển theo `plan.md`.

### MVP

- [ ] Authentication
- [ ] User Profile
- [ ] CV Upload
- [ ] CV Parsing
- [ ] AI CV Analysis
- [ ] Career Skill Gap
- [ ] Career Roadmap
- [ ] Interview Session
- [ ] AI Interview Evaluation
- [ ] Testing
- [ ] Deployment
