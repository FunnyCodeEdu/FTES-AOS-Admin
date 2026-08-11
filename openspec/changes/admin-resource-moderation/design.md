# Design — admin-resource-moderation (implementation-ready)

## 1. Route & màn hình

| Path | Layout | Component | Nav |
|---|---|---|---|
| `/academic/moderation` | `admin` | `ResourceModerationQueuePage` | `{ label:"Hàng đợi duyệt học liệu", icon:<SafetyCertificateOutlined/>, group:"Học thuật" }` |
| `/academic/resources/review` | `admin` | `ResourceReviewQueuePage` (cũ) | **gỡ nav** — route giữ nguyên |

Chọn `src/features/academic/moderation/` chứ KHÔNG phải `content/moderation`:

- đối tượng duyệt là **học liệu của môn** (`subjectId`, PE/FE của môn) — cùng miền với
  `academic/{subjects,resources,terms}`, và nav group đúng là **"Học thuật"**;
- `src/features/moderation/` (không gắn `academic/`) đã bị chiếm bởi **moderation cộng đồng**
  (report/workflow/mod-log, nav group "Cộng đồng") — đặt học liệu vào đó sẽ trộn hai miền;
- `src/features/content/` hiện chỉ có `blog` (nội dung biên tập nội bộ), không phải đóng góp theo môn.

## 2. Permission gates

- Route: `requiredPermissions: ["resource.approve", "admin.resource.read"]` — **OR-semantics**
  (`PermissionRoute` → `hasAnyPermission`). Cố ý OR: approver thuần (`resource.approve`) vào được
  để duyệt; admin học thuật đọc-only (`admin.resource.read`) vào xem tồn đọng nhưng không thấy nút.
- Nút Duyệt / Từ chối / Duyệt hàng loạt: `<Can permissions={["resource.approve"]}>`.
- BE mới là hàng rào thật: `AdminContentController.approveResource/rejectResource` gọi
  `access.require("resource.approve")`; `getResource`/`getResourceVersions` gọi
  `access.require("admin.resource.read")`. FE gate chỉ để ẩn control.
- **Scope**: FE KHÔNG tự lọc theo môn. `GET /resources/moderation/pending` đã lọc phía server theo
  `identity.approvableSubjectIds()` (`null` = toàn cục → thấy tất; set rỗng → `cb.disjunction()` →
  trang rỗng; set có id → `subjectId IN (…)`). Vì vậy **payload rỗng không phân biệt được** "hết
  việc" với "bạn không có phạm vi duyệt" → empty state dùng đúng một câu trung tính
  **"Không có mục nào chờ duyệt"**.

## 3. API contract tiêu thụ

Envelope `{code,message,data}` được interceptor bóc sẵn → `res.data` LÀ payload.

### 3.1 `coreClient` (base `/api/v1`) — endpoint KHÔNG nằm dưới `/admin`

| Method | Path | Request | Response (`data`) |
|---|---|---|---|
| GET | `/resources/moderation/pending` | query `page` (**0-based**), `size` | `PageResponse<ResourceSummary>` |
| GET | `/resources/{id}/images` | — | `FeAlbumView` |
| GET | `/resources/{id}/download` | `responseType:"blob"` | bytes (không envelope) |

`ResourceSummary` (BE `ResourceDtos.ResourceSummary`) — **đây là toàn bộ những gì hàng đợi có**:

```
{ id, title, type, subjectId, visibility, license,
  avgRating, ratingCount, downloadCount, lockedForViewer, createdAt }
```

⚠️ **KHÔNG có** `status` (thừa — spec BE ép `status = PENDING_APPROVAL`), **không có `uploaderId`**,
**không có `description`**, **không có `subjectName`**, **không có `rejectedReason`**, và không có
mốc "submittedAt" riêng — `createdAt` là mốc duy nhất, BE sort `ASC createdAt` (cũ nhất trước).
Hệ quả thiết kế:

- cột **"Người gửi"** KHÔNG dựng ở bảng; `uploaderId` chỉ lấy được ở drawer qua
  `GET /admin/resources/{id}` (field `createdBy`);
- cột **"Gửi lúc"** dùng `createdAt` (kèm tooltip "thời điểm tạo học liệu");
- **tên môn** phải tra riêng (xem §5).

`FeAlbumView` (BE `FeAlbumDtos`): `{ resourceId, images: FeImageView[], total, maxImages }`,
`FeImageView = { id, resourceId, imageUrl, sortOrder, caption, uploadedBy, commentCount, createdAt }`.

### 3.2 `apiClient` (base `/api/v1/admin`)

| Method | Path | Quyền BE | Request | Response (`data`) |
|---|---|---|---|---|
| GET | `/resources/{id}` | `admin.resource.read` | — | `ResourceDetailResponse` |
| GET | `/resources/{id}/versions` | `admin.resource.read` | — | `{ items: ResourceVersion[] }` |
| POST | `/resources/{id}/approve` | `resource.approve` | **không body** | `null` |
| POST | `/resources/{id}/reject` | `resource.approve` | `{ reason }` | `null` |

**Vì sao approve/reject đi đường `/admin` chứ không phải `POST /api/v1/resources/{id}/approve` của
`ResourceController`**: chỉ nhánh admin ghi audit —
`audit.record(actor, "resource.approve"|"resource.reject", "resource", id, before, after)` +
`markRecorded(request)`. Nhánh public (`service.approveDirect/rejectDirect`) không ghi audit admin.
Quyết định duyệt là hành động nguy hiểm theo `CLAUDE.md` → bắt buộc audit.

`POST /approve` trả `ApiResponse<Void>` ⇒ `res.data === null`. Mutation khai
`useMutation<void, …>` và **không** đọc gì từ response (code cũ trong `resources.api.ts` ép kiểu
`ResourceDetail` là sai contract — không dùng lại).

`POST /approve` **không nhận `@RequestBody`** ⇒ gửi kèm `{note}` là no-op im lặng. Vì vậy màn này
**không có ô "ghi chú khi duyệt"** — thà không có còn hơn có ô nhập rồi vứt.

## 4. Ép lý do từ chối (3 lớp)

1. **Form**: `Form.Item name="reason"` với `rules: [{ required: true, whitespace: true, … },
   { min: 5 }]` — `whitespace: true` chặn chuỗi toàn khoảng trắng (`required` đơn thuần thì `"   "`
   vẫn hợp lệ).
2. **Nút**: `okButtonProps={{ danger: true, disabled: !reasonValue?.trim() }}` — theo dõi bằng
   `Form.useWatch("reason", form)`, nên không bấm gửi được khi rỗng.
3. **Gửi**: `form.validateFields()` rồi mới `mutateAsync({ id, reason: reason.trim() })`.

BE là chốt cuối: `helper.requireReason(body.reason(), "reject")` → 400 `ADMIN_REASON_REQUIRED`
(đã có sẵn trong `ADMIN_ERROR_MESSAGES`).

## 5. Tên môn (subjectId → nhãn)

Hàng đợi chỉ có `subjectId`. Dựng map một lần bằng `useSubjects({ page:1, pageSize:1000 })` (chính
nguồn `SubjectSelect` đang dùng) → `Map<id, "CODE - Name">`, render `subjectLabel(subjectId)`.

Query này đi GraphQL `adminSubjects` và cần quyền đọc môn; caller chỉ có `resource.approve` có thể
bị từ chối. Vì vậy **lỗi của nó bị nuốt có chủ đích** — không render Alert, không chặn bảng: nhãn
rơi về `subjectId` rút gọn 8 ký tự đầu + tooltip id đầy đủ. Hàng đợi vẫn duyệt được bình thường.

## 6. Preview trong drawer

```
type === "FE"  → FeAlbumPreview: GET /resources/{id}/images
                 → Image.PreviewGroup + lưới thumbnail (sort theo sortOrder), caption dưới ảnh,
                   badge "n/maxImages".
type !== "FE"  → VersionsPreview: GET /admin/resources/{id}/versions
                 → List phiên bản (version, trạng thái upload, người tạo, thời điểm)
                 + nút "Tải tệp" (downloadResourceFile — dùng lại từ resources.api.ts).
```

**Preview hỏng không được chặn drawer**: mỗi khối preview có `isError` riêng → `Alert type="warning"`
+ nút "Thử lại" TRONG khối đó; metadata và cặp nút Duyệt/Từ chối nằm ngoài khối, luôn render. Kể cả
`GET /admin/resources/{id}` lỗi (vd caller không có `admin.resource.read`), drawer vẫn hiển thị
được title/type/subject/createdAt lấy từ **dòng bảng đã truyền vào** và vẫn duyệt/từ chối được.

Tải tệp: dùng lại `downloadResourceFile(id)` — đi `GET /resources/{id}/download` dạng blob qua
`coreClient` (kèm Bearer). KHÔNG dùng `/download-url` vì Cloudinary chặn delivery `raw` → 401.
Lưu ý nghiệp vụ: BE đóng watermark lúc tải, nên bản tải về có watermark — đúng ý đồ, không phải bug.

## 7. Duyệt hàng loạt — làm được vì lỗi hiện được theo TỪNG mục

`Table` bật `rowSelection` (`rowKey="id"`). Nút "Duyệt N mục" → `Modal.confirm` → chạy:

```ts
const results = await Promise.allSettled(ids.map((id) => approveResourceRequest(id)));
```

`approveResourceRequest` là **hàm API trần** (không phải hook mutation) nên **không** kích
`handleAdminMutationError` → không bắn N notification chồng nhau. Sau đó luôn mở
`BulkApproveResultModal`:

- toàn bộ OK → `Result status="success"` "Đã duyệt N mục";
- có lỗi → `Result status="warning"` "Đã duyệt X/N mục" + `List` các mục **thất bại** kèm tiêu đề và
  `adminErrorMessage(err)` của chính mục đó.

Chạy **tuần tự hoá phần hiển thị nhưng song song phần mạng** là chấp nhận được vì N ≤ pageSize (≤50)
và mỗi request độc lập. Sau khi xong: `invalidateQueries(moderationKeys.all)` + xoá selection.

## 8. Query keys & invalidation

```ts
resourceModerationKeys = {
  all: ["admin", "resource-moderation"],
  queues: () => [...all, "queue"],
  queue: (params) => [...queues(), params],       // { page, pageSize }
  details: () => [...all, "detail"],
  detail: (id) => [...details(), id],
  versions: (id) => [...all, "versions", id],
  album: (id) => [...all, "album", id],
}
```

Approve/reject `onSuccess` → invalidate `resourceModerationKeys.all` (bay cả queue lẫn detail đang
mở) **và** `resourcesKeys.all` của feature `resources` (bảng học liệu + detail của mục vừa duyệt
đang hiển thị `status` cũ). Không optimistic update — chỉ invalidate + refetch, đúng brief.

## 9. Busy state theo dòng

Page giữ `busyId: string | null`. Hook mutation dùng CHUNG cho mọi dòng nên `isPending` là cờ toàn
cục — nút của dòng đặt `loading={busy.action === "approve" && busy.id === record.id}` và
`disabled={busy.id !== null}`. Không có `Spin` phủ cả bảng; `Table` chỉ `loading` khi thật sự đang
tải trang mới (`isLoading && !data`), còn refetch nền dùng `placeholderData: keepPreviousData` để
bảng không nhấp nháy.

## 10. Phân trang

BE `page` **0-based**, AntD `current` **1-based** → `page: current - 1` khi gọi, `current: page + 1`
khi render. `total` lấy từ payload (`total` là tổng SERVER-side). Lọc loại + tìm kiếm là
**client-side trên trang hiện tại** (endpoint không nhận filter) — UI nói rõ điều đó bằng dòng phụ
"Lọc/tìm áp dụng trong trang hiện tại" để không ai tưởng đã tìm toàn hệ.

## 11. Mã lỗi bổ sung `ADMIN_ERROR_MESSAGES`

| Mã BE | Thông điệp |
|---|---|
| `RESOURCE_NOT_FOUND` | Không tìm thấy học liệu — có thể đã bị xử lý hoặc xoá. |
| `RESOURCE_INVALID_STATE` | Học liệu không còn ở trạng thái chờ duyệt — hãy làm mới hàng đợi. |
| `RESOURCE_FORBIDDEN` | Bạn không có quyền duyệt học liệu của môn này. |

`ADMIN_REASON_REQUIRED` đã có sẵn, không thêm lại.
