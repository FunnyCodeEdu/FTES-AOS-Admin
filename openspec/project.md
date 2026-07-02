# Project Context — FTES-AOS-Admin

Admin CMS v2 của FTES Academic Operating System — xây mới từ đầu, quản trị **đa tầng**:
Super Admin / Admin theo mảng / Moderator / CTV (scoped). Thay thế admin cũ 2-role.

- Stack: Vite · React 18 · TypeScript · Ant Design 5 · React Router · TanStack Query · Zustand.
- Mô hình tầng quyền + conventions: `docs/ADMIN-ARCHITECTURE.md` (BẮT BUỘC đọc trước).
- Format spec: `docs/SPEC-AUTHORING.md`.
- Backend: FTES-AOS-Backend (`/api/v1/admin/...`), RBAC scoped grants từ change
  `identity-rbac` + `admin-api` bên đó.
