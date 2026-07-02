# Tasks — admin-ctv-program

## 1. Khung feature & API layer
- [ ] 1.1 Tạo `src/features/ctv-program/` (admin) + `src/features/ctv-workspace/` (CTV); đăng ký route vào `routeRegistry` với `requiredPermissions`/scoped-grant guard
- [ ] 1.2 API hooks theo bảng design.md: invites, members, performance, grantable-permissions, me/scopes, me/todo, me/kpi, onboarding token
- [ ] 1.3 Types: `CtvInvite`, `CtvMember`, `CtvScope`, `CtvKpi`, `GrantHistoryEntry` (đánh dấu assumption)

## 2. Invite flow (admin mảng)
- [ ] 2.1 InviteListPage: table server-side + filter trạng thái + badge pending
- [ ] 2.2 `InviteForm` modal: email → scope picker (tái dùng của rbac) → permissions từ `grantable-permissions` lọc theo scopeType → hạn + note → preview → submit
- [ ] 2.3 Success state: copy link, trạng thái email; xử lý lỗi trùng invite pending (link tới invite cũ)
- [ ] 2.4 InviteDetailPage: copy link, gửi lại email, thu hồi (confirm + reason) + invalidation

## 3. Onboarding (CTV)
- [ ] 3.1 OnboardingPage `/ctv/onboarding/:token`: guard login với returnUrl; load token → tóm tắt invite + checklist
- [ ] 3.2 Checklist bắt buộc: điều khoản, hướng dẫn theo loại scope, cam kết — Accept chỉ bật khi tick đủ required
- [ ] 3.3 Accept → refetch `['auth','me']` + `['ctv','me','scopes']` → redirect `/ctv`
- [ ] 3.4 Trạng thái lỗi: token hết hạn/thu hồi (410), token sai email tài khoản (nút logout đổi tài khoản)

## 4. CTV Workspace
- [ ] 4.1 WorkspaceHomePage: scope cards (kèm hạn) + todo gộp (`['ctv','me','todo']` poll 60s) + KPI mini
- [ ] 4.2 CtvGroupPage: tabs/nút render theo permission grant (members, pending posts duyệt/từ chối); mọi query kèm scopeId
- [ ] 4.3 CtvResourcePage: list + upload/sửa học liệu trong scope; KHÔNG render approve nếu thiếu `resource.approve`
- [ ] 4.4 Scoped guard: URL ngoài scope → `/403` "ngoài scope được gán"; grant hết hạn → gỡ card + nav; banner sắp hết hạn (<7 ngày)
- [ ] 4.5 Search trong workspace bó theo scope hiện tại (scopeId bắt buộc trong mọi request)

## 5. KPI & performance
- [ ] 5.1 CtvKpiPage: stats cá nhân + chart đóng góp theo tuần/tháng + phân theo scope
- [ ] 5.2 TeamPerformancePage (admin): bảng xếp hạng CTV, filter range/scope, drill-down member
- [ ] 5.3 Empty/loading (chart placeholder) states cho cả hai dashboard

## 6. Vòng đời grant CTV (admin mảng)
- [ ] 6.1 MemberListPage: roster + grant sắp hết hạn + KPI 30d
- [ ] 6.2 MemberDetailPage tab Grants: gia hạn (multi-select + hạn mới + reason), mở rộng (form scope/quyền), thu hồi (reason) — đều confirm nêu hệ quả + audit ref
- [ ] 6.3 Tab Lịch sử: timeline đầy đủ (mời/chấp nhận/gia hạn/mở rộng/thu hồi — actor, detail, reason)
- [ ] 6.4 Invalidation + xử lý xung đột (grant đã bị thu hồi bởi người khác → refetch)

## 7. Verify
- [ ] 7.1 npm run build xanh + tsc --noEmit sạch
- [ ] 7.2 Smoke test: CTV không thấy nav/console admin; URL group ngoài scope ra 403; admin thiếu `ctv.invite.manage` không mời được; thu hồi grant → workspace CTV mất scope không cần re-login
