# admin-resource-moderation — Hàng đợi duyệt học liệu tập trung

## Why

Người dùng (không phải staff) đóng góp học liệu + đề thi (đề **PE**, album ảnh đề **FE**) cho một
môn. Mọi thứ do người ngoài staff upload bị giữ ở `PENDING_APPROVAL` cho tới khi có người duyệt.

Hiện CTV/curator xử được **phần của môn mình** ngay trên trang môn phía web học viên, nhưng **admin
không có chỗ nào nhìn thấy và dọn TOÀN BỘ tồn đọng**. Trang `/academic/resources/review` sẵn có
không lấp được chỗ này: nó đọc qua GraphQL `adminResources(filter:{status:"pending"})` — nguồn
admin-global, KHÔNG đi qua scope duyệt của backend — nên với CTV subject-scoped nó hoặc lỗi quyền
hoặc trả nội dung ngoài scope, và nó không preview được album FE.

Backend đã có sẵn đúng endpoint hàng đợi: `GET /api/v1/resources/moderation/pending` — đã **scope
sẵn phía server** theo `approvableSubjectIds()` (approver toàn cục → thấy tất; CTV theo môn → chỉ
môn của mình; không có quyền → trả **rỗng**, không 403). Change này dựng mặt admin tiêu thụ nó.

## What Changes

- **Feature folder mới** `src/features/academic/moderation/{api,components,pages}` theo khuôn
  `academic/terms` (query-key factory `["admin","resource-moderation"]`, hooks TanStack Query,
  mutation `invalidateQueries` + `onError: handleAdminMutationError`).
- **`ResourceModerationQueuePage`** (`/academic/moderation`): bảng phân trang các mục chờ duyệt —
  tiêu đề, chip loại (PE/FE tô nổi), môn, thời điểm gửi. Lọc theo loại + ô tìm kiếm **client-side**
  (endpoint chỉ nhận `page`/`size`). Duyệt / Từ chối ngay trên dòng, **busy state theo dòng**
  (không spinner toàn trang). Rỗng → "Không có mục nào chờ duyệt".
- **`ResourceModerationDetailDrawer`**: metadata (môn, người gửi, visibility, license, phiên bản,
  lý do từ chối trước) + preview: `type=FE` render thumbnail album từ `GET /resources/{id}/images`;
  loại khác hiện lịch sử phiên bản (tên file/version) + nút tải. **Preview hỏng không chặn drawer**
  (Alert cục bộ, nút Duyệt/Từ chối vẫn dùng được).
- **`RejectResourceModal`**: textarea lý do **BẮT BUỘC** — `Form.Item` `required` + `whitespace`,
  nút OK `disabled` khi lý do rỗng/toàn khoảng trắng → không bao giờ gửi được request để BE trả
  400 `ADMIN_REASON_REQUIRED`.
- **Duyệt hàng loạt** (`BulkApproveResultModal`): chọn nhiều dòng → duyệt tuần tự bằng
  `Promise.allSettled`; kết quả hiện modal liệt kê **từng mục thất bại kèm lý do**, thành công một
  phần KHÔNG hiển thị như thành công toàn bộ.
- **Route + nav + gate**: 1 entry `/academic/moderation` trong `routeRegistry.tsx`
  (`requiredPermissions: ["resource.approve","admin.resource.read"]`, `nav: { label:"Hàng đợi duyệt
  học liệu", icon:<SafetyCertificateOutlined/>, group:"Học thuật" }`). Nút Duyệt/Từ chối bọc
  `<Can permissions={["resource.approve"]}>`.
- **Gỡ `nav` của `/academic/resources/review`** (route GIỮ nguyên, vẫn gate `resource.approve`, vẫn
  vào được bằng URL/deep-link) để trong nhóm "Học thuật" chỉ còn MỘT lối vào việc duyệt học liệu.
- **Bản địa hoá lỗi**: thêm `RESOURCE_NOT_FOUND`, `RESOURCE_INVALID_STATE`, `RESOURCE_FORBIDDEN`
  vào `ADMIN_ERROR_MESSAGES`.
- **Types**: block `// ---------- Resource moderation queue ----------` trong
  `src/features/academic/types/index.ts`.

## Non-goals

- **KHÔNG** đưa `DELETE /api/v1/admin/resources/{id}` vào màn này. Đó là **hard delete** (BE
  `resources.delete` xoá thật, không soft-delete) — đặt nút xoá vĩnh viễn cạnh nút Duyệt là tai nạn
  chờ xảy ra. Xoá học liệu tiếp tục sống ở `ResourceListPage`/`ResourceDetailPage`, nơi có
  `DeleteConfirmModal` + lý do.
- KHÔNG sửa `PATCH /resources/{id}` (sửa metadata) từ hàng đợi — việc ở đây là duyệt/từ chối.
- KHÔNG đổi BE.

## Capabilities

### New Capabilities
- `admin-resource-moderation`: hàng đợi duyệt học liệu tập trung cho admin — liệt kê mọi mục
  `PENDING_APPROVAL` trong phạm vi duyệt của caller (scope do BE quyết), preview (album FE / phiên
  bản + tải), duyệt và từ chối (lý do bắt buộc) đơn lẻ hoặc duyệt hàng loạt với báo lỗi theo từng
  mục.

### Modified Capabilities
- `resource-management`: hàng đợi cũ `/academic/resources/review` không còn xuất hiện ở nav trái
  (bị hàng đợi tập trung thay thế); route + gate `resource.approve` giữ nguyên.

## Impact

- FE files mới: `src/features/academic/moderation/api/{moderation.keys.ts,moderation.api.ts}`,
  `src/features/academic/moderation/components/{ModerationQueueTable,ResourceTypeChip,ResourceModerationDetailDrawer,FeAlbumPreview,RejectResourceModal,BulkApproveResultModal}.tsx`,
  `src/features/academic/moderation/pages/ResourceModerationQueuePage.tsx`.
- FE files sửa: `src/app/routeRegistry.tsx` (+1 route/nav, −1 nav của route review),
  `src/features/academic/types/index.ts` (+block moderation queue),
  `src/shared/api/errors.ts` (+3 mã `RESOURCE_*`).
- API BE tiêu thụ:
  - `coreClient` (base `/api/v1`): `GET /resources/moderation/pending?page=&size=`,
    `GET /resources/{id}/images`, `GET /resources/{id}/download` (blob, dùng lại
    `downloadResourceFile`).
  - `apiClient` (base `/api/v1/admin`): `GET /resources/{id}`, `GET /resources/{id}/versions`,
    `POST /resources/{id}/approve`, `POST /resources/{id}/reject`.
- Permission leaf: `resource.approve` (duyệt/từ chối), `admin.resource.read` (đọc detail/versions).
- KHÔNG đổi BE, KHÔNG migration.
