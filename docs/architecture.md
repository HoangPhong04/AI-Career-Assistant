# Architecture

## High-level

```text
Next.js App Router
├── UI / Components
├── Route Handlers
├── Domain Services
├── Prisma
└── AI Provider
       ↓
   PostgreSQL
```

## Domain boundaries

- Auth
- CV
- Career
- Interview
- Admin

## Rule

UI không truy cập database trực tiếp nếu nghiệp vụ cần xử lý phức tạp.

Ưu tiên:

```text
Component
→ API / Server Action
→ Service
→ Prisma / AI
```
