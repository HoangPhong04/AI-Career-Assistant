# AI Career Assistant — Project Plan

## 1. Tổng quan dự án

**Tên dự án:** Hệ thống hỗ trợ định hướng nghề nghiệp và phỏng vấn bằng AI  
**Tên tiếng Anh:** AI Career Assistant

Đây là hệ thống web ứng dụng trí tuệ nhân tạo nhằm hỗ trợ người dùng phân tích CV, xác định kỹ năng hiện tại, tìm khoảng cách kỹ năng so với vị trí nghề nghiệp mục tiêu, xây dựng lộ trình phát triển nghề nghiệp và luyện phỏng vấn với AI.

### Luồng tổng thể

```text
Upload CV
   ↓
CV Parser
   ↓
CV Analyzer
   ↓
Phân tích kỹ năng / kinh nghiệm
   ↓
Career Roadmap
   ↓
Skill Gap + Lộ trình học tập
   ↓
Interview Simulator
   ↓
AI đánh giá câu trả lời
   ↓
Feedback + Báo cáo
```

---

## 2. Mục tiêu dự án

### 2.1. Mục tiêu tổng quát

Xây dựng một nền tảng web tích hợp AI giúp sinh viên, người mới tốt nghiệp và người tìm việc có thể đánh giá hồ sơ nghề nghiệp và chuẩn bị cho mục tiêu nghề nghiệp một cách có hệ thống.

### 2.2. Mục tiêu cụ thể

- Cho phép người dùng đăng ký, đăng nhập và quản lý hồ sơ.
- Cho phép upload CV.
- Trích xuất nội dung từ CV.
- Phân tích CV bằng AI.
- Nhận diện kỹ năng, kinh nghiệm, học vấn và các thông tin nghề nghiệp chính.
- Đánh giá mức độ phù hợp của CV.
- Cho phép người dùng chọn vị trí nghề nghiệp mục tiêu.
- Phân tích Skill Gap.
- Sinh Career Roadmap.
- Cho phép theo dõi tiến độ roadmap.
- Tạo phiên phỏng vấn mô phỏng bằng AI.
- Sinh câu hỏi theo vị trí nghề nghiệp.
- Nhận câu trả lời của người dùng.
- AI đánh giá câu trả lời và đưa ra feedback.
- Tổng hợp kết quả sau phiên phỏng vấn.

---

## 3. Phạm vi dự án

### 3.1. Trong phạm vi

#### A. Authentication & User Profile
- Đăng ký.
- Đăng nhập.
- Đăng xuất.
- Quản lý thông tin cá nhân.
- Phân quyền USER/ADMIN.

#### B. CV Analyzer
- Upload CV PDF/DOCX.
- Lưu thông tin file.
- Trích xuất text.
- Phân tích CV bằng AI.
- Phân tích:
  - Thông tin cá nhân.
  - Học vấn.
  - Kinh nghiệm.
  - Kỹ năng.
  - Dự án.
  - Chứng chỉ.
  - Điểm mạnh.
  - Điểm cần cải thiện.
- Lưu kết quả phân tích.

#### C. Career Roadmap
- Chọn nghề nghiệp mục tiêu.
- Xác định level hiện tại.
- Phân tích Skill Gap.
- Đề xuất kỹ năng cần bổ sung.
- Sinh roadmap theo giai đoạn.
- Theo dõi tiến độ.

#### D. Interview Simulator
- Chọn vị trí.
- Chọn mức độ.
- Tạo phiên phỏng vấn.
- AI sinh câu hỏi.
- Người dùng trả lời.
- AI chấm điểm.
- AI đưa feedback.
- Tổng kết phiên phỏng vấn.

### 3.2. Ngoài phạm vi phiên bản đầu

- Kết nối trực tiếp với website tuyển dụng.
- Tự động ứng tuyển việc làm.
- Video interview realtime.
- Nhận diện khuôn mặt.
- Phân tích giọng nói chuyên sâu.
- Hệ thống thanh toán.
- Mobile app native.

---

## 4. Người dùng & Phân quyền

### 4.1. USER

Có quyền:
- Quản lý profile.
- Upload và quản lý CV của bản thân.
- Xem kết quả phân tích CV.
- Tạo Career Roadmap.
- Theo dõi tiến độ roadmap.
- Tạo và thực hiện Interview Session.
- Xem kết quả phỏng vấn.

### 4.2. ADMIN

Có quyền:
- Đăng nhập khu vực quản trị.
- Quản lý người dùng.
- Xem thống kê hệ thống.
- Quản lý dữ liệu hệ thống.
- Theo dõi trạng thái AI/service.
- Quản lý nội dung/cấu hình nếu được triển khai.

---

## 5. Yêu cầu chức năng chi tiết

### FR-01 — Authentication
- FR-01.1 Đăng ký tài khoản.
- FR-01.2 Đăng nhập.
- FR-01.3 Đăng xuất.
- FR-01.4 Kiểm tra quyền truy cập.

### FR-02 — User Profile
- FR-02.1 Xem profile.
- FR-02.2 Cập nhật profile.
- FR-02.3 Lưu nghề nghiệp mục tiêu.

### FR-03 — CV Management
- FR-03.1 Upload CV.
- FR-03.2 Kiểm tra loại file.
- FR-03.3 Lưu metadata.
- FR-03.4 Xem danh sách CV.
- FR-03.5 Xem chi tiết CV.
- FR-03.6 Xóa CV.

### FR-04 — CV Parsing
- FR-04.1 Trích xuất nội dung CV.
- FR-04.2 Chuẩn hóa text.
- FR-04.3 Xử lý lỗi đọc file.

### FR-05 — CV AI Analysis
- FR-05.1 Phân tích cấu trúc CV.
- FR-05.2 Nhận diện kỹ năng.
- FR-05.3 Nhận diện kinh nghiệm.
- FR-05.4 Đánh giá điểm mạnh/yếu.
- FR-05.5 Đưa ra đề xuất cải thiện.
- FR-05.6 Sinh điểm đánh giá có giải thích.

### FR-06 — Career Analysis
- FR-06.1 Nhập/chọn target role.
- FR-06.2 Xác định current level.
- FR-06.3 Phân tích Skill Gap.
- FR-06.4 Đề xuất kỹ năng cần học.

### FR-07 — Career Roadmap
- FR-07.1 Sinh roadmap.
- FR-07.2 Chia roadmap theo giai đoạn.
- FR-07.3 Hiển thị nhiệm vụ.
- FR-07.4 Theo dõi progress.

### FR-08 — Interview Simulator
- FR-08.1 Tạo interview session.
- FR-08.2 Chọn target role.
- FR-08.3 Chọn difficulty.
- FR-08.4 Sinh câu hỏi.
- FR-08.5 Nhận câu trả lời.
- FR-08.6 Đánh giá câu trả lời.
- FR-08.7 Sinh feedback.
- FR-08.8 Tổng kết session.

### FR-09 — Admin
- FR-09.1 Quản lý user.
- FR-09.2 Xem thống kê.
- FR-09.3 Theo dõi trạng thái hệ thống.

---

## 6. Yêu cầu phi chức năng

### NFR-01 — Performance
- Trang chính phản hồi nhanh.
- Không block UI trong thời gian AI xử lý.
- Các tác vụ AI có loading/progress state.

### NFR-02 — Security
- Không commit API key.
- Mật khẩu phải được hash.
- API phải kiểm tra authentication/authorization.
- Người dùng chỉ được truy cập dữ liệu của chính mình.
- Validate file upload.
- Giới hạn kích thước file.

### NFR-03 — Reliability
- Có xử lý lỗi database.
- Có xử lý lỗi AI API.
- Có retry hoặc thông báo lỗi phù hợp với tác vụ AI.

### NFR-04 — Maintainability
- TypeScript strict.
- Tách module theo domain.
- Validate request bằng schema.
- Không viết logic nghiệp vụ lớn trực tiếp trong UI component.

### NFR-05 — Usability
- Giao diện responsive.
- Navigation rõ ràng.
- Feedback lỗi dễ hiểu.
- Hỗ trợ tiếng Việt.

---

## 7. Công nghệ sử dụng

### Frontend / Fullstack
- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend
- Next.js Route Handlers / Server-side logic
- REST API nội bộ

### Database
- PostgreSQL
- Prisma ORM

### AI
- AI API abstraction
- Ưu tiên OpenAI API; có thể mở rộng provider khác.

### Validation
- Zod

### Development
- Git
- GitHub
- VS Code

### Deployment dự kiến
- Vercel cho Next.js.
- PostgreSQL cloud/local tùy môi trường.

> Lưu ý: Không bắt buộc triển khai tất cả công nghệ nâng cao ngay từ đầu. Embedding, Vector Database, RAG, OCR hoặc voice/video AI chỉ thêm khi thực sự cần cho phạm vi đồ án.

---

## 8. Database (Tóm tắt)

### User
- id
- email
- passwordHash
- fullName
- role
- createdAt
- updatedAt

### CV
- id
- userId
- originalName
- filePath
- fileType
- extractedText
- status
- analysisJson
- score
- createdAt
- updatedAt

### CareerRoadmap
- id
- userId
- cvId
- targetRole
- currentLevel
- skillGapJson
- roadmapJson
- progress
- createdAt
- updatedAt

### InterviewSession
- id
- userId
- targetRole
- status
- overallScore
- feedbackJson
- createdAt
- updatedAt

### InterviewQuestion
- id
- sessionId
- question
- category
- expectedAnswer
- userAnswer
- score
- feedback
- orderNo
- createdAt

### Quan hệ chính

```text
User 1 ───── N CV
User 1 ───── N CareerRoadmap
CV   1 ───── N CareerRoadmap
User 1 ───── N InterviewSession
InterviewSession 1 ───── N InterviewQuestion
```

---

## 9. Luồng nghiệp vụ chính

### 9.1. Luồng phân tích CV

```text
User đăng nhập
    ↓
Upload CV
    ↓
Validate file
    ↓
Lưu file + metadata
    ↓
Extract text
    ↓
AI phân tích
    ↓
Chuẩn hóa kết quả
    ↓
Lưu database
    ↓
Hiển thị báo cáo
```

### 9.2. Luồng Career Roadmap

```text
Chọn CV
    ↓
Nhập Target Role
    ↓
Chọn Current Level
    ↓
AI phân tích Skill Gap
    ↓
AI tạo Roadmap
    ↓
Lưu Roadmap
    ↓
User theo dõi progress
```

### 9.3. Luồng Interview

```text
Chọn Target Role
    ↓
Chọn Difficulty
    ↓
Create Session
    ↓
AI tạo Question
    ↓
User trả lời
    ↓
AI Evaluate
    ↓
Feedback
    ↓
Question tiếp theo
    ↓
Hoàn thành Session
    ↓
Overall Report
```

---

## 10. Tiêu chí hoàn thành (Acceptance Criteria)

### Authentication
- [ ] User đăng ký được.
- [ ] User đăng nhập được.
- [ ] User không thể truy cập dữ liệu của user khác.
- [ ] ADMIN và USER có quyền khác nhau.

### CV Analyzer
- [ ] Upload được CV hợp lệ.
- [ ] Từ chối file không hợp lệ.
- [ ] Extract được nội dung CV.
- [ ] AI trả về kết quả phân tích có cấu trúc.
- [ ] Kết quả được lưu database.
- [ ] User xem lại được lịch sử CV.

### Career Roadmap
- [ ] User chọn target role.
- [ ] Hệ thống phân tích Skill Gap.
- [ ] Hệ thống tạo roadmap.
- [ ] Roadmap có các giai đoạn/nhiệm vụ.
- [ ] User cập nhật được progress.

### Interview Simulator
- [ ] Tạo được interview session.
- [ ] AI sinh được câu hỏi.
- [ ] User gửi được câu trả lời.
- [ ] AI chấm điểm và feedback.
- [ ] Có tổng kết session.

### System
- [ ] `npm run lint` chạy thành công.
- [ ] `npm run build` chạy thành công.
- [ ] Database migration/push chạy thành công.
- [ ] Không commit secret/API key.
- [ ] README có hướng dẫn setup.
- [ ] Các API chính có xử lý lỗi.

---

## 11. Phân công & Thời gian

### Thành viên 1 — System / Integration
- Architecture.
- Authentication.
- User/Profile.
- Dashboard.
- API integration.
- Code review/integration.

### Thành viên 2 — CV Analyzer
- Upload CV.
- File validation.
- CV parser.
- AI CV analysis.
- CV result UI.

### Thành viên 3 — Career Roadmap
- Target role.
- Skill Gap.
- Roadmap generation.
- Progress tracking.
- Roadmap UI.

### Thành viên 4 — Interview Simulator
- Interview session.
- Question generation.
- Answer evaluation.
- Feedback.
- Interview report.

### Tiến độ dự kiến

| Giai đoạn | Công việc |
|---|---|
| Tuần 1 | Phân tích yêu cầu, thống nhất kiến trúc |
| Tuần 2 | Setup project, Git, database |
| Tuần 3 | Authentication + UI foundation |
| Tuần 4-6 | CV Analyzer |
| Tuần 6-8 | Career Roadmap |
| Tuần 8-10 | Interview Simulator |
| Tuần 10-11 | Integration |
| Tuần 11-12 | Testing + bug fixing |
| Tuần 12-13 | Hoàn thiện báo cáo |
| Tuần 13-14 | Demo + slide + bảo vệ |

---

## 12. Rủi ro & Giải pháp

| Rủi ro | Giải pháp |
|---|---|
| AI trả kết quả không ổn định | Dùng structured output/schema và prompt versioning |
| AI API lỗi/rate limit | Xử lý exception, retry có giới hạn, hiển thị lỗi |
| CV PDF khó parse | Chuẩn hóa parser và kiểm tra nhiều loại PDF |
| CV scan là ảnh | Đưa OCR vào phạm vi mở rộng nếu còn thời gian |
| Chi phí AI tăng | Giới hạn token, cache kết quả, chọn model phù hợp |
| Database conflict khi merge | Migrate có quy trình, thống nhất schema |
| Merge code khó | Mỗi người làm feature branch, PR trước khi merge |
| Lộ API key | `.env`, `.gitignore`, không hard-code secret |
| Scope quá lớn | Ưu tiên MVP: CV → Roadmap → Interview |
| Deadline gấp | Chốt MVP trước, tính năng nâng cao làm sau |

---

## MVP bắt buộc

Nếu thời gian hạn chế, ưu tiên hoàn thành theo thứ tự:

1. Authentication
2. Upload + phân tích CV
3. Career Roadmap
4. Interview Simulator
5. Database persistence
6. Testing
7. Deployment
8. Admin/nâng cao

Các tính năng nâng cao chỉ thực hiện sau khi MVP hoạt động ổn định.
