# FTES-AOS-Admin

Admin CMS mới của **FTES Academic Operating System v2** — xây từ đầu, thay thế
`FunnyCodeEdu-frontend-admin` cũ (chỉ có 2 role ADMIN/INSTRUCTOR). Trọng tâm:
**quản trị đa tầng** để tuyển và trao quyền cho đội CTV.

## Mô hình phân tầng

| Tầng | Phạm vi |
|---|---|
| **Super Admin** | Toàn hệ thống: cấu hình, RBAC, feature flag, audit |
| **Admin theo mảng** ("admin this, admin that") | 1 mảng nghiệp vụ: Users / Academic / Commerce / Community / Operations |
| **Moderator** | Kiểm duyệt nội dung: report queue, workflow duyệt |
| **CTV (cộng tác viên)** | Scoped: quản đúng group / bộ học liệu / subject được gán |

## Tech stack

Vite · React 18 · TypeScript · Ant Design 5 · React Router · TanStack Query · Zustand.
Backend: [FTES-AOS-Backend](https://github.com/FunnyCodeEdu/FTES-AOS-Backend) (`/api/v1/admin/...`).

## Chạy dev

```bash
npm install
npm run dev     # http://localhost:5173, API base qua VITE_API_BASE_URL
```

## Cấu trúc

- `openspec/` — toàn bộ spec admin theo OpenSpec; mỗi console là một change spec-only.
- `docs/ADMIN-ARCHITECTURE.md` — mô hình tầng quyền, permission catalog, conventions.
- `docs/SPEC-AUTHORING.md` — format viết spec.
- `src/` — skeleton app (permission-driven routing/nav).
