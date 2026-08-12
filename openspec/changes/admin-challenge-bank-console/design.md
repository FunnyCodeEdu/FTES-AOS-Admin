# Design — admin-challenge-bank-console

## 1. Route & màn hình

| Route | Trang | Layout | Nav |
|---|---|---|---|
| `/academic/challenge-bank` | `ChallengeBankPage` | `admin` | "Kho thử thách" · nhóm **Học thuật** |
| `/academic/challenge-review` | `ChallengeReviewQueuePage` | `admin` | "Duyệt thử thách" · nhóm **Học thuật** |

### 1.1 `ChallengeBankPage` — kho theo MÔN, không cần khoá

```
┌ Kho thử thách ─────────────────────────────────────────────── [Làm mới] [+ Tạo đề vào kho] ┐
│ [Tìm tiêu đề…] [Tag ▾ (typeahead, multi)] [Loại ▾] [Độ khó ▾] [Trạng thái ▾]              │
│ [Môn ▾ SubjectSelect] [Khoá ▾ CourseSelect] [☐ Chỉ chưa gắn bài]        [Xoá bộ lọc]      │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ Thử thách (title + slug + loại)│ Tag (chip) │ Độ khó │ Trạng thái │ Dùng ở N bài │ ⋯       │
└───────────────────────────────────────────────────────────────────────────────────────────┘
                       phân trang server-side (page/size, page 0-based ở BE)
```

Menu `⋯` mỗi dòng: **Sửa tag** · **Đề thi (tệp)** · **Chỗ dùng** · **Sửa nhanh**
(`ChallengeEditModal` sẵn có). KHÔNG có mục nào về chấm AI.

### 1.2 `ChallengeReviewQueuePage`

Bảng thử thách chờ duyệt + lọc môn (tham số server `subjectId`), mỗi dòng **Duyệt** / **Từ chối**,
và nút xem đề đính kèm nếu có. Empty state trung tính: payload rỗng không phân biệt được "hết việc"
với "bạn không có phạm vi duyệt" (mirror `ResourceModerationQueuePage`).

### 1.3 Modal / thành phần dùng lại

| Thành phần | Vai trò |
|---|---|
| `ChallengeTagPicker` | `Select mode="tags"` + typeahead `GET /tags` (debounce), cho gõ tag mới |
| `ChallengeTagsModal` | Đọc `GET /{id}/tags` → sửa → `PUT /{id}/tags` (replace-set) |
| `ChallengePaperModal` | Tải/thay/gỡ đề thi của 1 challenge |
| `ChallengePlacementsModal` | Liệt kê `GET /{id}/placements`, thêm (`POST`) / gỡ (`DELETE`) từng chỗ |
| `CreateBankChallengeModal` | Tạo challenge KHÔNG cần khoá → đặt tag → (tuỳ chọn) tải đề |
| `ChallengeBankFilters` | Thanh lọc của kho (controlled, không tự fetch danh sách) |

## 2. Permission gates

| Đối tượng | Gate | Thiếu quyền |
|---|---|---|
| Route `/academic/challenge-bank` | OR `admin.challenge.read`, `admin.challenge.manage`, `admin.course.manage` | `PermissionRoute` → `/403`; `NavMenu` ẩn mục |
| Nút ghi ở kho (tạo đề, sửa tag, đề thi, thêm/gỡ chỗ dùng) | `<Can permissions={["admin.challenge.manage"]}>` | ẩn nút, bảng vẫn đọc được |
| Route `/academic/challenge-review` | **KHÔNG gate** (không khai `requiredPermissions`) | — |
| Nút Duyệt / Từ chối | **KHÔNG gate client-side** | BE quyết; lỗi hiện qua notification |

> Vì sao hàng đợi duyệt không gate: quyền duyệt của CTV là **scoped theo SUBJECT**, không phải leaf
> GLOBAL. Gate bằng danh sách leaf global sẽ ẩn đúng nút của đúng người được giao việc (lỗi đã từng
> xảy ra ở màn duyệt học liệu). `GET /review-queue` đã lọc theo phạm vi duyệt phía server và trả
> **trang rỗng** cho người không có phạm vi, nên render vô điều kiện là an toàn.

Phạm vi kho (BE `requireBankScope`): bỏ trống `courseId` cần quyền GLOBAL. Người quản-khoá gọi
không kèm `courseId` sẽ nhận **403 `ADMIN_ACCESS_DENIED`**. FE KHÔNG đoán trước phạm vi; khi bắt
`ForbiddenError` ở query kho, hiện Alert hướng dẫn "chọn một khoá học ở bộ lọc Khoá rồi thử lại".

## 3. API contract tiêu thụ

Base `apiClient` = `/api/v1/admin`; envelope `{code,message,data}` đã bóc bởi interceptor.

| Method | Path | Quyền | Request | Response |
|---|---|---|---|---|
| GET | `/challenges/bank` | GLOBAL, hoặc course-manager + `courseId` | `q, tags[], type, difficulty, subjectId, courseId, status, free, onlyUnattached, page(0-based), size` | `{items:[BankChallengeView], total, page, size}` |
| GET | `/challenges/tags` | đọc kho | `q, limit` | `[{slug,label}]` |
| GET | `/challenges/{id}/tags` | quản challenge | — | `[{slug,label}]` |
| PUT | `/challenges/{id}/tags` | quản challenge | `{tags:["PE","MAE101"]}` (replace-set, ≤32) | `[{slug,label}]` |
| GET | `/challenges/{id}/placements` | quản challenge | — | `[{id,lessonId,courseId,orderNo,createdAt}]` |
| POST | `/challenges/{id}/placements` | quản challenge + quản khoá của bài đích | `{lessonId}` | `PlacementView` (idempotent, KHÔNG gỡ chỗ cũ) |
| DELETE | `/challenges/{id}/placements` | quản challenge | `?lessonId=` | `null` |
| POST | `/challenges` | `admin.challenge.manage` | `{title, description, difficulty, type, subjectId, startsAt, endsAt, free}` | `{id}` — status khởi tạo `DRAFT`, slug tự sinh |
| PATCH | `/challenges/{id}` | `admin.challenge.manage` | partial (`subjectId`, `difficulty`, …) | `{id}` |

**Assumption — endpoint đang xây song song** (đường dẫn/hình dạng đã chốt, chỉ chưa deploy):

| Method | Path | Request | Response | Ghi chú |
|---|---|---|---|---|
| POST | `/challenges/{id}/paper` | multipart `file` | `{paperUrl, paperMime, paperFilename, paperSizeBytes}` | pdf/png/jpeg/webp, ≤25 MB, BE đóng watermark |
| DELETE | `/challenges/{id}/paper` | — | `null` | |
| GET | `/challenges/review-queue` | `subjectId, page, size` | `{items:[BankChallengeView], total, page, size}` | đã scope server-side; không có phạm vi ⇒ trang RỖNG |
| POST | `/challenges/{id}/approve` | — | — | |
| POST | `/challenges/{id}/reject` | `{reason}` | — | `reason` blank ⇒ 400 |

Assumption bổ sung phải ghi rõ vì hợp đồng không nói:
- **`BankChallengeView` sẽ mang thêm** `paperUrl/paperMime/paperFilename/paperSizeBytes` (optional).
  Không có endpoint GET đọc đề của một challenge, nên đây là nguồn duy nhất để hiển thị đề hiện tại
  khi mới mở màn. FE khai chúng là optional và, khi vắng, chỉ hiện đề vừa tải trong phiên.
- **`review-queue` dùng `page` 0-based** như `/bank` (BE `@RequestParam(defaultValue="0")`).
- **Status mới `PENDING_APPROVAL`** xuất hiện trong `status` của `BankChallengeView`; và challenge bị
  từ chối mang lý do (FE hiện `rejectionReason` nếu BE trả, optional).

## 4. State & data

TanStack Query keys (factory mới, tách khỏi `challengeBankKeys` của kho-theo-khoá):

```ts
challengeBankConsoleKeys = {
  all:         ["admin", "challenge-bank-console"],
  bank:(p)     [...all, "bank", p],           // p = params đã chuẩn hoá
  tagVocab:(q) [...all, "tag-vocab", q],
  tagsOf:(id)  [...all, "tags", id],
  placements:(id) [...all, "placements", id],
  review:(p)   [...all, "review-queue", p],
}
```

- Kho + hàng đợi: `placeholderData: (prev) => prev` để đổi trang không nháy về rỗng.
- `retry: false` cho query kho — 403 phạm vi là câu trả lời cuối cùng, thử lại 3 lần chỉ làm chậm.
- Sau mọi mutation ghi: invalidate `challengeBankConsoleKeys.all` **và** `exerciseKeys.all`
  (kho-theo-khoá + panel bài đang mở phải thấy thay đổi tag/chỗ dùng).
- `buildBankQueryParams` là **hàm thuần** (bỏ field rỗng, `tags` gửi lặp, `page` 1-based UI → 0-based
  BE) — có unit test; hook chỉ ghép hàm này với axios.

## 5. Luồng nghiệp vụ chính

1. **Nạp đề PE của một môn (không có khoá)**: `+ Tạo đề vào kho` → nhập tiêu đề/mô tả, chọn **Môn**,
   độ khó → tag tự điền `PE` + **mã môn** (sửa được) → `POST /challenges` (DRAFT) → `PUT /{id}/tags`
   → bước 2 mở `ChallengePaperModal` để tải tệp đề. Lỗi ở bước tag/đề KHÔNG cuộn ngược lại xoá
   challenge đã tạo: modal báo rõ "đã tạo thử thách nhưng chưa đặt được tag/đề, thử lại từ dòng ở kho".
2. **Khoá học nhặt bài từ kho**: dòng kho → **Chỗ dùng** → chọn Khoá (CourseSelect) → chọn Bài học
   (từ `useCourse(courseId).tree`) → `POST /placements` → danh sách "đang dùng ở" **thêm** một dòng,
   các dòng cũ còn nguyên. Nhãn nút là "Thêm chỗ dùng", không phải "Gắn vào bài" (tránh gợi ý chuyển).
3. **Duyệt**: hàng đợi → `Duyệt` (confirm nêu hệ quả) hoặc `Từ chối` → modal bắt lý do
   (`required` + `whitespace` + OK disabled tới khi `trim()` khác rỗng + `trim()` khi gửi) →
   `POST /reject {reason}` → invalidate hàng đợi.
4. **Tải đề sai định dạng/quá nặng**: chặn ở client trước khi bắn (`validatePaperFile`), message nêu
   đúng nguyên nhân ("chỉ nhận PDF/PNG/JPEG/WebP" / "tệp 31.2 MB vượt giới hạn 25 MB").

## 6. UX states

- **Loading**: `Skeleton` mirror layout bảng ở lần tải đầu; đổi trang giữ dữ liệu cũ + `loading` của
  `Table`.
- **Empty**: kho rỗng có bộ lọc ⇒ "Không có thử thách nào khớp bộ lọc" + nút *Xoá bộ lọc*; không lọc
  ⇒ "Kho chưa có thử thách nào". Hàng đợi rỗng ⇒ một câu trung tính.
- **Error**: `Alert` + nút *Thử lại*. Riêng `ForbiddenError` ở kho ⇒ Alert hướng dẫn chọn khoá
  (thông điệp 403 mặc định của client là chung chung, không nói ra được điều này).
- **Destructive**: gỡ đề thi và gỡ chỗ dùng đều qua `Modal.confirm` nêu hệ quả; từ chối duyệt bắt lý
  do. Không có xoá cứng nào trong change này.
- **Đang xây song song**: đề thi + hàng đợi duyệt hiện `Alert` "endpoint chưa deploy" khi lỗi 404/405
  thay vì để lộ lỗi thô.
