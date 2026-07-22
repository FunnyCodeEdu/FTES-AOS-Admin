# Design — payroll-instructor-console-fixes

## Nguồn chân lý (đã đối chiếu code BE thật)

- `PayrollAdminController` `@RequestMapping("/api/v1/payroll/admin")` với `@PutMapping("/deductions/{deductionId}")`
  + `@DeleteMapping("/deductions/{deductionId}")` → path đúng (coreClient base `/api/v1`) là
  `/payroll/admin/deductions/{deductionId}`. Create thì vẫn `/payroll/admin/earnings/{id}/deductions`.
- `PayrollError` (BE): PAYROLL_ILLEGAL_TRANSITION, PAYROLL_EARNING_NOT_FOUND, PAYROLL_EARNING_NOT_OPEN,
  PAYROLL_DEDUCTION_NOT_FOUND, PAYROLL_INVALID_AMOUNT, PAYROLL_NO_OPEN_BATCH, PAYROLL_FORBIDDEN,
  PAYROLL_BALANCE_NOT_ENOUGH, PAYROLL_UNAUTHENTICATED.
- RBAC: `payroll.read` gán ADMIN/SUPER_ADMIN/LECTURER; `payroll.manage` chỉ admin. → console admin tổng
  phải gate `payroll.manage`; self-view GV gate qua COURSE-scope ở `/instructor/earnings`.
- `course.manage` GLOBAL sau V27 chỉ còn ADMIN + ADMIN_ACADEMIC; LECTURER dùng owner/COURSE-scope.

## Quyết định

- **Không** đụng `useUpdateCourse` (file dùng chung của dev A, có test `courses.api.test.ts` khẳng định
  title/desc đi admin PATCH). Sửa tên cho instructor tách thành change riêng (reroute core) — ở đây
  instructor "Tổng quan" để **view-only** (`readOnly`), tránh nút Lưu 403. Đổi loại khoá LEGACY↔PACKAGE
  cũng để admin (kèm provision/backfill — quyết định nghiệp vụ).
- Ẩn Publish + Kho-thử-thách trong instructor console thay vì hiện rồi 403: 2 surface đó cần
  `course.publish` / `admin.challenge.manage` GLOBAL, chưa mở owner-authz ở BE (defer).
- "Tổng giảng viên" = `new Set(rows.map(r => r.instructorId).filter(Boolean)).size` — 1 GV có thể có
  nhiều kỳ lương (rows) sau payout nên `rows.length` sai.

## Ngoài phạm vi

- Reroute sửa tên khoá cho instructor; owner-authz Publish + challenge-bank (đều là change riêng).
- `sse.test.ts` đang đỏ trên origin/main (không thuộc file thay đổi ở đây) — không xử lý.
