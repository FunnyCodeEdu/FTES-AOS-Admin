# Tasks — admin-resource-moderation

## 1. Types & API layer
- [x] 1.1 `academic/types/index.ts`: thêm block `// ---------- Resource moderation queue ----------`
  (`PendingResourceSummary` khớp ĐÚNG `ResourceDtos.ResourceSummary`, `ResourcePage<T>`,
  `FeAlbumImage`, `FeAlbumView`, `ModerationQueueParams`).
- [x] 1.2 `moderation/api/moderation.keys.ts`: factory `["admin","resource-moderation"]`
  (`all/queues/queue/details/detail/versions/album`).
- [x] 1.3 `moderation/api/moderation.api.ts`:
  - `useModerationQueue({page,pageSize})` — **coreClient** `GET /resources/moderation/pending`,
    `page` 0-based, `placeholderData: keepPreviousData`.
  - `useModerationResourceDetail(id)` — **apiClient** `GET /resources/{id}`.
  - `useModerationResourceVersions(id)` — **apiClient** `GET /resources/{id}/versions`.
  - `useFeAlbum(id, enabled)` — **coreClient** `GET /resources/{id}/images`.
  - `approveResourceRequest(id)` / `rejectResourceRequest(id, reason)` — hàm API TRẦN (bulk dùng,
    không kích notification theo từng mục).
  - `useApproveResource()` / `useRejectResource()` — bọc hàm trần, `onError:
    handleAdminMutationError`, `onSuccess` invalidate `resourceModerationKeys.all` +
    `resourcesKeys.all`.
  - `useBulkApproveResources()` — `Promise.allSettled`, trả `{ succeeded, failed[] }`.

## 2. Errors
- [x] 2.1 `shared/api/errors.ts`: thêm `RESOURCE_NOT_FOUND`, `RESOURCE_INVALID_STATE`,
  `RESOURCE_FORBIDDEN` vào `ADMIN_ERROR_MESSAGES` (tiếng Việt).

## 3. Components
- [x] 3.1 `ResourceTypeChip.tsx`: `Tag` theo `ResourceType`, PE/FE tô nổi (màu riêng + `bold`),
  nhãn lấy từ `resources/constants.ts` (`RESOURCE_TYPE_OPTIONS`) để không lệch chữ với form.
- [x] 3.2 `ModerationQueueTable.tsx`: cột Tiêu đề / Loại (chip) / Môn / Gửi lúc / Thao tác;
  `rowSelection`; nút Duyệt + Từ chối gate `<Can permissions={["resource.approve"]}>`, `loading`
  theo `busy.id`, `disabled` khi có thao tác khác đang chạy; phân trang server (0-based ↔ 1-based).
- [x] 3.3 `FeAlbumPreview.tsx`: `useFeAlbum` → `Image.PreviewGroup` + lưới thumbnail sort theo
  `sortOrder`, caption, badge `total/maxImages`; `Alert`+"Thử lại" cục bộ khi lỗi; `Empty` khi album
  rỗng.
- [x] 3.4 `ResourceModerationDetailDrawer.tsx`: `Descriptions` metadata (môn, người gửi
  `createdBy`, visibility, license, phiên bản, tạo lúc, lý do từ chối cũ) + preview theo type
  (FE → `FeAlbumPreview`; khác → danh sách phiên bản + nút "Tải tệp" dùng `downloadResourceFile`);
  footer Duyệt/Từ chối gate `resource.approve`; mọi khối lỗi độc lập, fallback về dữ liệu dòng.
- [x] 3.5 `RejectResourceModal.tsx`: `Form.Item` `reason` `required` + `whitespace` + `min:5`,
  `Form.useWatch` khoá nút OK khi rỗng, `okType="danger"`, gửi `reason.trim()`.
- [x] 3.6 `BulkApproveResultModal.tsx`: `Result` success/warning + `List` các mục thất bại
  (tiêu đề + `adminErrorMessage`).

## 4. Page & route
- [x] 4.1 `pages/ResourceModerationQueuePage.tsx`: title + `Card`; hàng công cụ (Input.Search, Select
  loại, nút Làm mới, nút "Duyệt N mục" gate `resource.approve`); map `subjectId → "CODE - Name"` qua
  `useSubjects` (nuốt lỗi, fallback id rút gọn); `busy` state theo dòng; `Modal.confirm` cho duyệt
  (đơn + hàng loạt); empty state "Không có mục nào chờ duyệt" vs "Không có mục nào khớp bộ lọc".
- [x] 4.2 `app/routeRegistry.tsx`: thêm route `/academic/moderation` (layout `admin`,
  `requiredPermissions: ["resource.approve","admin.resource.read"]`, nav `{ label:"Hàng đợi duyệt
  học liệu", icon:<SafetyCertificateOutlined/>, group:"Học thuật" }`).
- [x] 4.3 `app/routeRegistry.tsx`: gỡ `nav` khỏi `/academic/resources/review` (giữ route + gate),
  kèm comment nêu lý do.

## 5. Verify
- [x] 5.1 `npx tsc --noEmit` sạch.
- [x] 5.2 `NODE_OPTIONS=--max-old-space-size=4096 npm run build` xanh.
- [x] 5.3 `npx openspec validate admin-resource-moderation --strict` hợp lệ.
