# FTES-AOS-Admin — Working Agreement

Admin CMS v2, xây MỚI từ đầu (KHÔNG copy code từ `FunnyCodeEdu-frontend-admin` cũ).

## Quy trình BẮT BUỘC

1. **OpenSpec cho MỌI thay đổi**: `openspec new change <name>` → proposal/design/specs/tasks
   → `/opsx:apply` → `/opsx:archive`. Spec toàn hệ admin đã có trong `openspec/changes/`.
2. Đọc `docs/ADMIN-ARCHITECTURE.md` trước khi viết spec/code — mô hình 4 tầng quyền
   (Super Admin / Admin mảng / Moderator / CTV scoped) và permission catalog là luật.
3. **Verify trước commit**: `npm run build` xanh + `tsc --noEmit` sạch.

## Nguyên tắc sản phẩm

- **Permission-driven, không role-driven UI**: nav/route/action render theo permission
  từ BE trả về, KHÔNG hardcode `role === 'ADMIN'` như admin cũ.
- **Mọi mutation nguy hiểm có confirm + audit**: đổi quyền, khoá user, xoá nội dung,
  refund — confirm dialog + ghi audit log (BE làm, FE hiển thị).
- CTV chỉ thấy đúng scope được gán (group/học liệu/subject) — cả nav lẫn data.
- API: FTES-AOS-Backend `/api/v1/admin/...`, envelope `{code, message, data|null}`.

## Ranh giới

- 1 OpenSpec change = 1 commit. KHÔNG push/deploy/lệnh phá huỷ nếu chưa hỏi.
