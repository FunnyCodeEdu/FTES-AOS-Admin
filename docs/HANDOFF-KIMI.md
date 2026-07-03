# Bàn giao triển khai cho Kimi Code

> Người viết: reviewer (Claude). Người thực thi: **Kimi Code CLI**.
> Bạn (Kimi) chịu trách nhiệm implement. Sau mỗi change, reviewer duyệt diff trước khi sang change kế.

---

## 0. Bối cảnh bắt buộc đọc trước khi gõ dòng code đầu tiên

Đọc theo thứ tự, KHÔNG bỏ qua:

1. `CLAUDE.md` — working agreement của repo.
2. `docs/ADMIN-ARCHITECTURE.md` — **nguồn chân lý**: 4 tầng quyền (Super Admin / Admin mảng /
   Moderator / CTV scoped), nguyên tắc permission-driven, conventions FE, route map.
3. `docs/SPEC-AUTHORING.md` — cách spec được viết (để hiểu, không sửa).

3 luật không được vi phạm (từ CLAUDE.md + architecture):

- **Permission-driven, KHÔNG role-driven.** Nav/route/nút hành động gate theo permission leaf +
  scoped grant BE trả về. Cấm mọi so sánh kiểu `role === 'ADMIN'`.
- **Mutation nguy hiểm = confirm dialog + audit.** Đổi quyền, khoá user, xoá nội dung, refund,
  publish → dialog nêu rõ hệ quả. Audit do BE ghi, FE hiển thị.
- **CTV chỉ thấy đúng scope được gán** — cả nav lẫn data.

API: FTES-AOS-Backend `/api/v1/admin/...`, envelope `{code, message, data|null}`.

---

## 1. Công cụ & skill phải dùng

Bạn là Kimi, KHÔNG phải Claude — nên bạn **không có Claude "Skill tool"**. Nhưng toàn bộ quy
trình OpenSpec vẫn dùng được vì nó nằm ở 2 nơi bạn đọc/chạy được:

- **`openspec` CLI** — chạy trực tiếp trong terminal (lệnh cụ thể ở §3).
- **Skill dạng markdown**: `.claude/skills/openspec-apply-change/SKILL.md` và
  `.claude/skills/openspec-archive-change/SKILL.md`. Đọc như tài liệu quy trình rồi làm theo.

=> "Dùng skill + OpenSpec đầy đủ" nghĩa là: **mỗi thay đổi phải đi qua đúng vòng apply → verify →
archive của OpenSpec, lấy task từ CLI chứ không tự bịa.** Không code lung tung ngoài quy trình.

---

## 2. Thứ tự triển khai (LÀM ĐÚNG THỨ TỰ NÀY)

`admin-foundation` là **blocker cứng** — mọi console đứng trên nó, phải xong + được reviewer duyệt
trước tiên. Các change còn lại phụ thuộc mềm, làm tuần tự theo thứ tự dưới (đã tính dependency):

| # | Change | Vì sao ở vị trí này |
|---|--------|---------------------|
| 1 | `admin-foundation` | Shell + login + API client + permission nav/guard. Nền của tất cả. **Bắt buộc trước.** |
| 2 | `admin-rbac-management` | Định nghĩa catalog permission + role + scoped grant — bộ từ vựng mọi console gate theo. |
| 3 | `admin-user-console` | Console độc lập, đơn giản nhất để chạy rốt-đa pattern list/detail/action. |
| 4 | `admin-academic-console` | Course/Subject/Resource + approval workflow. |
| 5 | `admin-freemium-preview` | Editor lesson + cấu hình học thử — **cần academic-console trước**. |
| 6 | `admin-commerce-console` | Order/Payment/Wallet + refund flow. |
| 7 | `admin-community-console` | Posts/Groups/Events + moderation queue. |
| 8 | `admin-operations-console` | Broadcast/banner/feature toggle. |
| 9 | `admin-ctv-program` | Workspace CTV scoped — làm sau khi các domain nó scope vào đã tồn tại. |
| 10 | `admin-analytics-audit` | Dashboard tổng + audit viewer — gom mọi domain, làm cuối. |

Không tự ý đổi thứ tự. Nếu phát hiện dependency ngược, **dừng lại báo reviewer**, đừng tự quyết.

---

## 3. Vòng làm việc cho MỖI change (lặp lại y hệt 10 lần)

Thay `<name>` bằng tên change đang làm.

```bash
# 1. Lấy trạng thái + schema
openspec status --change "<name>" --json

# 2. Lấy hướng dẫn apply — LỆNH NÀY XUẤT RA DANH SÁCH TASK + contextFiles.
#    KHÔNG tự chép task từ trí nhớ; đây là nguồn task chính thức.
openspec instructions apply --change "<name>" --json
```

3. **Đọc hết** file trong `contextFiles` (proposal / design / specs / tasks) trước khi code.
4. **Implement từng task một** theo `tasks.md` của change:
   - Code tối thiểu, đúng phạm vi task. Không thêm abstraction/tính năng ngoài spec.
   - Xong task nào, đổi `- [ ]` → `- [x]` trong `tasks.md` **ngay** (đây là sổ tiến độ).
   - Tuân conventions FE ở `ADMIN-ARCHITECTURE.md §3`: feature folder `src/features/<console>/`,
     server-side pagination/sort/filter, mọi list có search + empty/loading/error state.
5. **DỪNG và hỏi reviewer** nếu: task mơ hồ, spec mâu thuẫn với code sẵn có, hoặc phát hiện lỗi
   thiết kế. **Không đoán.**
6. **Verify trước khi bàn giao** (bắt buộc, từ CLAUDE.md):
   ```bash
   npm run build      # phải xanh
   npm run typecheck  # tsc --noEmit, phải sạch, 0 error
   ```
7. Báo reviewer: "change `<name>` xong, N/N task, build+tsc sạch". **Reviewer duyệt diff.**
8. Chỉ khi reviewer OK: archive.
   ```bash
   openspec archive "<name>"   # hoặc theo .claude/skills/openspec-archive-change/SKILL.md
   ```
   1 change = 1 commit. **KHÔNG push/deploy nếu chưa được yêu cầu.**
9. Sang change kế trong bảng §2.

---

## 4. Cảnh báo cụ thể — CÁI BẪY ở change #1

Repo hiện có **scaffold sẵn** nhưng đường dẫn LỆCH với spec `admin-foundation`:

| Đang có trong repo | Spec/tasks yêu cầu |
|---|---|
| `src/api/client.ts` | `src/shared/api/client.ts` |
| `src/auth/store.ts` | `src/features/auth/` + `src/shared/permissions/` |
| `src/shell/AdminShell.tsx` | `src/app/layout/AdminLayout.tsx` |
| `src/features/auth/LoginPage.tsx` (form `disabled`, placeholder) | LoginPage 2 bước (credentials → TOTP) |

`api/client.ts` hiện **clear thẳng khi 401**, spec yêu cầu **single-flight refresh + queue phát lại**
(tasks 2.3). Store hiện persist cả access token — spec `admin-auth-session` quyết định nơi lưu theo
"remember me", cần theo spec.

**Việc của bạn ở task 1.x:** di chuyển/viết lại scaffold sang layout `src/app/`, `src/shared/`,
`src/features/` theo `tasks.md`, KHÔNG để 2 bộ song song. Nếu thấy mơ hồ chỗ nào — hỏi reviewer
trước khi xoá file cũ.

---

## 5. Cổng review — reviewer sẽ soi những điểm này ở mỗi change

Làm sẵn cho khớp để pass nhanh:

- [ ] `npm run build` xanh, `tsc --noEmit` 0 error.
- [ ] Mọi task trong `tasks.md` đã `- [x]`, không bỏ sót, không đánh dấu khống.
- [ ] **Zero** so sánh role string — grep `role ===`, `role ==`, `=== 'ADMIN'` phải trống.
      Gate bằng permission/scoped-grant.
- [ ] Mọi mutation nguy hiểm có confirm dialog nêu hệ quả; action gọi endpoint có audit BE.
- [ ] List: server-side pagination/sort/filter + search + empty/loading/error state đủ.
- [ ] Route thiếu quyền → trang 403 nêu permission thiếu; chưa login → `/login?returnUrl=`.
- [ ] CTV: nav + data đều filter theo scope; scoped grant hết hạn (`expiresAt`) coi như không có.
- [ ] Không thêm dependency mới nếu stdlib/dep sẵn (antd/react-query/zustand/axios) làm được.
- [ ] Diff tối thiểu, đúng phạm vi change. Không rò task của change khác.

Fail bất kỳ dòng nào → trả lại, sửa, verify lại.

---

## 6. Nguyên tắc chống over-engineering (áp dụng xuyên suốt)

- Không interface cho 1 implementation, không factory cho 1 sản phẩm, không config cho hằng số.
- Tái dùng component/hook đã có trước khi viết mới. antd v5 lo phần lớn UI — đừng tự dựng lại.
- Ít file nhất, diff ngắn nhất mà vẫn đủ spec. Spec là trần yêu cầu, không phải sàn để thêm thắt.

---

## Tóm tắt 1 dòng cho Kimi

> Làm tuần tự bảng §2. Mỗi change: `openspec instructions apply` lấy task → code tối thiểu đúng
> spec, tick `[x]` → `npm run build && npm run typecheck` sạch → báo reviewer duyệt → `openspec
> archive`. Permission-driven, confirm+audit cho mutation nguy hiểm, CTV theo scope. Mơ hồ thì dừng
> hỏi, không đoán. Bắt đầu từ `admin-foundation` và xử cái bẫy scaffold ở §4.
