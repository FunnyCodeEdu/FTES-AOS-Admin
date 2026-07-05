# admin-ctv-program — Chương trình CTV: tuyển, onboard, workspace scoped, KPI

## Why

Theo `docs/ADMIN-ARCHITECTURE.md`, CTV (cộng tác viên) là tầng quyền thấp nhất: chỉ thao tác
trong scope được gán (group cụ thể / bộ học liệu / subject), quyền là subset do admin mảng cấp.
Mục tiêu sản phẩm là **tuyển đội CTV** về quản group, học liệu… nên cần trọn vòng đời:
admin mảng mời CTV kèm scope + quyền + thời hạn → CTV onboard (điều khoản, cam kết) → CTV làm
việc trong workspace `/ctv/*` chỉ thấy đúng scope (cả nav, list, search) → KPI ghi nhận đóng góp
→ admin mảng gia hạn/mở rộng/thu hồi. `admin-rbac-management` cho Super Admin thao tác grant
thô; change này đóng gói nghiệp vụ CTV cho admin mảng vận hành hằng ngày.

## What Changes

- **Invite flow** (`/ctv-program/invites`): admin mảng tạo lời mời kèm scope + tập quyền +
  thời hạn + ghi chú → sinh link/email; theo dõi trạng thái (pending/accepted/expired/revoked);
  thu hồi lời mời.
- **Onboarding**: người nhận mở link mời → xem tóm tắt scope/quyền/thời hạn → checklist bắt buộc
  (điều khoản, hướng dẫn, cam kết) → chấp nhận → BE kích hoạt grants → vào thẳng workspace.
- **CTV Workspace** (`/ctv/*`): trang chủ liệt kê scope được gán (group/bộ học liệu/subject),
  hàng đợi việc cần làm (pending posts/resources trong scope), công cụ thao tác trong scope.
  CTV KHÔNG bao giờ thấy dữ liệu ngoài scope — nav, list, search đều bó trong scope.
- **KPI & contribution**: dashboard cá nhân CTV (resource xử lý, post kiểm duyệt, đóng góp theo
  thời gian); dashboard admin mảng xem hiệu suất cả đội CTV, drill-down từng người.
- **Vòng đời grant CTV**: admin mảng gia hạn / mở rộng scope / thu hồi — confirm nêu hệ quả,
  bắt buộc lý do, lịch sử đầy đủ trên hồ sơ CTV.

## Capabilities

### New Capabilities
- `ctv-invitation`: tạo/thu hồi/theo dõi lời mời CTV kèm scope + quyền + thời hạn.
- `ctv-onboarding`: nhận lời mời, checklist điều khoản/cam kết, kích hoạt grants.
- `ctv-workspace`: workspace `/ctv/*` bó chặt theo scope (nav, list, search, todo, công cụ).
- `ctv-kpi-tracking`: KPI cá nhân CTV + dashboard hiệu suất đội cho admin mảng.
- `ctv-grant-lifecycle`: gia hạn/mở rộng/thu hồi quyền CTV kèm lịch sử đầy đủ.

### Modified Capabilities
Không sửa capability nào (dựa trên guard/nav/API client của `admin-foundation` và mô hình
grant của `admin-rbac-management`, không đổi hành vi của chúng).

## Impact

- Route mới: `/ctv-program/invites`, `/ctv-program/invites/:id`, `/ctv-program/members`,
  `/ctv-program/members/:id`, `/ctv-program/performance` (phía admin mảng);
  `/ctv/onboarding/:token`, `/ctv`, `/ctv/groups/:groupId`, `/ctv/resources`, `/ctv/kpi`
  (phía CTV).
- Feature folder: `src/features/ctv-program/` (admin mảng) + `src/features/ctv-workspace/` (CTV).
- API BE tiêu thụ: `/api/v1/admin/ctv/*` — phần lớn là **assumption** chờ BE chốt (design.md).
- Permission gates: `ctv.invite.manage`, `ctv.member.read`, `ctv.member.manage`,
  `ctv.performance.read` (admin mảng — tên leaf assumption); workspace CTV gate bằng
  scoped grants còn hiệu lực.
- Phụ thuộc: `admin-foundation` (guard, `<Can>`, API client), `admin-rbac-management`
  (mô hình scoped grant hiển thị đồng nhất).
