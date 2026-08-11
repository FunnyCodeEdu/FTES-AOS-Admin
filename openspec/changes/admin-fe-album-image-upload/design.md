# Design — admin-fe-album-image-upload

Nguồn sự thật của mọi con số dưới đây là BE `FTES-AOS-Backend@origin/main`
(`resource/service/FeAlbumService.java`, `resource/support/ResourceExamRateLimiter.java`,
`resource/web/FeAlbumController.java`, `resource/web/dto/FeAlbumDtos.java`,
`resource/domain/ResourceType.java`, `resource/web/ResourceExceptionHandler.java`).

## 1. Route & màn hình

| Route | Màn | Thay đổi |
| --- | --- | --- |
| `/academic/resources` | `ResourceListPage` → `ResourceFormModal` (tạo) | nhánh `type = FE` của modal |
| `/academic/resources/:id` | `ResourceDetailPage` → `ResourceFormModal` (sửa) | nhánh `type = FE` của modal |

Không thêm route, không thêm màn. Modal giữ nguyên bố cục; phần đổi nằm trong `Form.Item` chọn
tệp/thư mục và khối tiến độ.

Nhánh FE của modal gồm 4 khối, theo thứ tự trên xuống:

1. **Nút "Chọn thư mục"** (`<input webkitdirectory>` — giữ nguyên cách hiện tại, product owner thích
   UX này).
2. **Tóm tắt kế hoạch** (sau khi chọn): `N ảnh sẽ tải · còn trống M chỗ · ước tính ~X phút`.
3. **Cảnh báo** (`Alert type="warning"`, chỉ hiện khi có): các dòng "bỏ lại vì …" — quá trần 50,
   không phải ảnh, vượt 10MB, tệp rỗng — **kèm số lượng và tối đa 5 tên ví dụ**.
4. **Tiến độ** khi đang chạy: `<Progress percent>` (widget SẴN CÓ, tái dùng `phase`/`percent`) + một
   dòng trạng thái ("Đang tải ảnh 12/50 — de12.png", "Chờ 5s để không vượt 10 ảnh/phút", "Bị chặn tần
   suất — thử lại sau 20s (lần 2/4)") + nút **"Dừng"**.

Loại FE đổi nhãn `FE (thư mục)` → `FE (album ảnh)` trong `RESOURCE_TYPE_OPTIONS`.
Ô "Ghi chú phiên bản" **ẩn** ở nhánh FE (album không tạo version nên changelog vô nghĩa).

## 2. Permission gates

| Chỗ | Gate | Hành vi khi thiếu |
| --- | --- | --- |
| Nút "Upload học liệu" (list) | `<Can permissions={["resource.upload"]}>` — **GIỮ NGUYÊN** | không render nút |
| Nút "Sửa / tải phiên bản mới" (detail) | `<Can permissions={["admin.resource.manage"]}>` — **GIỮ NGUYÊN** | không render nút |
| Ô chọn thư mục FE khi **SỬA** | `FeAlbumView.canManage` **của server** (`GET /resources/{id}/images`) | thay ô chọn bằng `Alert` "Chỉ chủ học liệu hoặc người duyệt môn mới thêm được ảnh" |
| Ô chọn tệp khi **SỬA** (loại ≠ FE) | `canUploadVersion` hiện có (owner-only của `uploadVersion`) — **GIỮ NGUYÊN** | `Alert` hiện có |
| Ghi album | BE: `isOwnerOrApprover` + leaf `resource.fe.contribute` | 403 → thông báo tiếng Việt, dừng lượt, báo số ảnh đã nạp |

KHÔNG suy quyền album từ danh sách permission phía client: quyền duyệt của CTV là grant theo TỪNG
MÔN, client chỉ thấy leaf GLOBAL → suy ở client sẽ ẩn nút khỏi đúng người được phép và hiện nút cho
người sẽ ăn 403 (chính lý do BE trả `canManage`, xem javadoc `FeAlbumDtos.FeAlbumView`).
Lúc **TẠO** không hỏi `canManage` (chưa có resource) — người tạo là owner nên server sẽ cho ghi; nếu
thiếu leaf `resource.fe.contribute` thì ảnh đầu tiên trả 403 và lượt dừng với thông báo rõ.

## 3. API contract tiêu thụ

Cả hai endpoint nằm ở `/api/v1/resources/**`, **KHÔNG** dưới `/admin` → dùng `coreClient`
(cùng lý do `POST /resources/{id}/versions` đang dùng `coreClient`).

| Method | Path | Quyền BE | Request | Response `data` |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/resources/{id}/images` | đọc theo `VisibilityGuard.requireRead` | — | `FeAlbumView { resourceId, images[], total, maxImages, canManage }` |
| `POST` | `/api/v1/resources/{id}/images` | owner\|curator môn + `resource.fe.contribute` | `multipart/form-data`: `file` (bắt buộc), `caption` (tuỳ chọn) | `FeImageView { id, resourceId, imageUrl, sortOrder, caption, uploadedBy, commentCount, createdAt }` |

`FeImageView.sortOrder` = `max(sortOrder)+1` tại thời điểm nạp → **thứ tự gửi = thứ tự trang album**.

Ràng buộc server (client phải tự lọc TRƯỚC để không đốt quota rate-limit vào file chắc chắn bị từ chối):

- MIME: `image/png`, `image/jpeg`, `image/webp` (`FeAlbumService.ALLOWED_IMAGE_MIME`). BE còn đối
  chiếu **magic bytes** khớp MIME khai báo → ưu tiên `file.type` của trình duyệt, chỉ suy từ đuôi khi
  `file.type` rỗng.
- Kích thước: `0 < bytes ≤ 10MB` (`MAX_IMAGE_BYTES`).
- Trần album: 50 (`MAX_IMAGES_PER_ALBUM`, đọc động qua `FeAlbumView.maxImages`).
- Rate limit: 10/phút **và** 60/giờ (`ResourceExamRateLimiter.FE_IMAGE_PER_MINUTE/HOUR`).

Envelope lỗi: `ResourceExceptionHandler` trả `{code: <http>, message: "MÃ: chi tiết", data: null}` —
**mã nằm trong `message`, không nằm ở `data.errorCode`** → `getAdminErrorMessage` phải tra thêm token
trước dấu `:`. Mã gặp ở luồng này: `RESOURCE_RATE_LIMITED` (429), `RESOURCE_VALIDATION` (400),
`RESOURCE_FILE_TOO_LARGE` (400/413), `RESOURCE_UPLOAD_INCOMPLETE` (400),
`RESOURCE_STORAGE_UNAVAILABLE` (503), `RESOURCE_ACCESS_DENIED` (403 — interceptor đổi thành
`ForbiddenError` trước khi tới bảng tra, nên nhánh album tự đặt câu tiếng Việt riêng cho 403).

## 4. State & data

- **Query key mới**: `resourcesKeys.feAlbum(id)` = `["resources", "detail", id, "fe-album"]`;
  `useFeAlbum(id, enabled)` chỉ bật khi modal mở + đang SỬA + `type = FE`.
- **Không invalidate gì sau khi nạp album**: Admin không render album ở đâu; list/detail đã được
  `useCreateResource`/`useUpdateResource` invalidate. Nạp tiếp thì đọc lại album bằng `fetchFeAlbum`
  (gọi thẳng, không qua cache) để con trỏ luôn theo SỰ THẬT của server.
- **State trong modal** (thêm): `albumPlan` (kế hoạch đã lọc/sắp), `albumRun` (dòng trạng thái đang
  chạy), `waitSeconds` (đếm ngược nhịp chờ). **Ref**: `abortRef` (AbortController), `pendingRef`
  (`{resourceId, items, baseCount, uploaded}` để nạp tiếp), `createdIdRef` (đã có — chống tạo trùng).
- **Logic thuần** tách sang `lib/feAlbumUpload.ts` để test bằng vitest, modal chỉ ghép I/O + UI.

## 5. Luồng nghiệp vụ

### 5.1 Tạo học liệu FE có album (happy path)

1. Admin chọn môn/tên/loại `FE` → bấm "Chọn thư mục" → `planFeAlbumUpload(files, remaining)` chạy
   NGAY khi chọn: lọc ảnh hợp lệ, sắp tự nhiên theo `webkitRelativePath || name`, cắt theo chỗ trống,
   gom danh sách bị loại.
2. Bấm "Tạo" → `POST /resources` (code cũ) → `createdIdRef = id`.
3. `phase = "uploading"`; vòng lặp tuần tự: chờ đủ nhịp (≥6,5s tính từ lúc BẮT ĐẦU request trước) →
   `POST /resources/{id}/images` → `uploaded++` → `percent = round(uploaded/total*100)`.
4. Hết danh sách → `message.success("Đã tạo học liệu · đã tải N ảnh vào album")` → đóng modal.

> Nhịp 6,5s là con số nhỏ nhất **an toàn** với cửa sổ CỐ ĐỊNH của limiter: với khoảng cách `T`, số
> request tối đa rơi vào một cửa sổ 60s bất kỳ là `floor(60/T)+1`; `T = 6,0s` → 11 (vượt 10),
> `T = 6,5s` → 10 (khít trần). Hệ quả: album 50 ảnh mất ~5,5 phút — **nói trước cho admin** ở dòng
> ước tính chứ không để họ ngồi đoán.

### 5.2 Gặp 429 giữa chừng

`isFeRateLimitError(err)` = `ApiError` có `code === 429` hoặc message bắt đầu `RESOURCE_RATE_LIMITED`.
→ KHÔNG bỏ lượt: chờ `10s → 20s → 40s → 60s` rồi thử lại **CHÍNH tấm đó** (tối đa 4 lần, dòng trạng
thái nói rõ "lần k/4"). Hết 4 lần vẫn 429 (điển hình: đã chạm trần 60 ảnh/GIỜ) → dừng như 5.4 với câu
"đã chạm giới hạn 60 ảnh/giờ của máy chủ — chờ ít phút rồi bấm Tạo để nạp tiếp".

### 5.3 Admin bấm "Dừng"

`abortRef.current.abort()` → vòng lặp thoát ở điểm kiểm gần nhất (trước tấm kế, hoặc giữa lúc chờ
nhịp — nhịp chờ được cắt lát 500ms nên dừng gần như tức thì; request đang bay bị `signal` huỷ).
→ modal **không đóng**, `phase = "idle"`, hiện: "Đã dừng — đã tải N/M ảnh. Bấm Tạo để nạp tiếp từ ảnh
N+1." Học liệu đã tạo vẫn còn (không tạo lại).

### 5.4 Lỗi giữa chừng / nạp tiếp

- Lỗi bất kỳ (403, 400 validation, 503 storage, mạng) → dừng vòng lặp, `errorMsg` = câu tiếng Việt của
  lỗi **+ "Đã tải N/M ảnh"** + hướng dẫn nạp tiếp. `pendingRef` giữ `{items, uploaded, baseCount}`.
- Bấm "Tạo" lần nữa: KHÔNG tạo học liệu mới (`createdIdRef`), gọi `fetchFeAlbum(id)` → con trỏ tiếp
  tục `= min(items.length, max(uploaded_local, total_server − baseCount))` (đối chiếu server để không
  nạp trùng khi response của một tấm đã nạp bị mất giữa đường), rồi chạy tiếp phần còn lại.
- KHÔNG đụng luồng submit/approve: modal không gọi submit trước hay sau khi nạp ảnh (BE
  `ResourceService.submit` mới là nơi đòi album có ít nhất 1 ảnh).

### 5.5 SỬA học liệu FE đã có ảnh

`useFeAlbum` trả `{total, maxImages, canManage}` → chỗ trống `= maxImages − total`; kế hoạch cắt theo
số này (đầy → không cho chọn, nói rõ "album đã đủ 50 ảnh"). `canManage = false` → không render ô chọn
thư mục, hiện Alert giải thích.

## 6. UX states

| State | Hiển thị |
| --- | --- |
| Chưa chọn gì (FE) | "Chọn cả thư mục ảnh đề thi; mỗi ảnh là một trang của album (tối đa 50)." |
| Đã chọn, hợp lệ | "42 ảnh sẽ tải theo thứ tự tên · ước tính ~5 phút (máy chủ giới hạn 10 ảnh/phút)." |
| Đã chọn, có file bị loại | thêm `Alert warning` liệt kê **số lượng + lý do** (+ tối đa 5 tên ví dụ) |
| Quá trần | "Thư mục có 63 ảnh nhưng album chỉ chứa 50 → **bỏ lại 13 ảnh cuối** (theo thứ tự tên)." |
| Đang tải | `<Progress percent>` + "Đang tải ảnh 12/50 — de12.png" + nút "Dừng" (modal không đóng được bằng ESC/mask) |
| Chờ nhịp | "Chờ 5s để không vượt giới hạn 10 ảnh/phút…" (đếm ngược) |
| Bị 429 | "Máy chủ chặn tần suất — thử lại sau 20s (lần 2/4)…" |
| Dừng/lỗi | `Alert error` + "Đã tải N/M ảnh" + hướng dẫn bấm Tạo để nạp tiếp |
| Xong | `message.success` "Đã tạo học liệu · đã tải N ảnh vào album" |
| Không đủ quyền (SỬA) | `Alert info` "Chỉ chủ học liệu hoặc người duyệt môn mới thêm được ảnh vào album." |

## 7. Không làm (out of scope)

- Sửa caption / kéo-thả sắp xếp / xoá ảnh trong Admin (BE có `PUT …/images/order`, `DELETE …/images/{imageId}`)
  — thứ tự đã đúng nhờ sắp theo tên; quản lý album chi tiết là change riêng.
- Gỡ dependency `jszip` khỏi `package.json`: `node_modules` của worktree là junction dùng CHUNG với
  repo gốc, gỡ phải chạy `npm install` (đụng worktree khác + package-lock) → để một commit dọn riêng.
- KHÔNG đổi BE, KHÔNG đổi hành vi submit/approve, KHÔNG đổi `<Can>` gác nút mở modal.
