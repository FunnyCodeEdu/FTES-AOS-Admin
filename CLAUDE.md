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

## Build trước khi đẩy

CD chỉ deploy khi `npm run build` xanh; build đỏ thì workflow lặng lẽ dừng và bản trên server đứng
im — không có cảnh báo nào. Đã cắn 01/09/2026 ở repo Admin: một commit lọt qua `tsc --noEmit` nhưng
`tsc -b` đỏ (biến khai mà không dùng), CD chết nhiều giờ mà không ai biết.

```
git config core.hooksPath .githooks   # bật một lần cho mỗi bản clone
npm run build                          # kiểm tay khi cần
```

`.githooks/pre-push` tự chạy build khi đẩy lên `main`/`production` và CHẶN nếu đỏ.

**Kiểm bằng `npm run build`, KHÔNG phải `tsc --noEmit`** — `--noEmit` bỏ qua `noUnusedLocals` và
project references nên vẫn xanh trong khi build thật đỏ.
