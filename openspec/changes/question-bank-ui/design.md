# Design — question-bank-ui

Feature "Kho câu hỏi" trong admin v2: AntD 5, server-table + create-modal như
`src/features/academic/quiz/pages/QuizBankPage.tsx`, data-layer (coreClient + query-key +
invalidation) như `src/features/payroll/`, poll dừng-khi-terminal như
`notifications.useRunningTasks` + `ai-assist/hooks/useAiJobPolling`. Gate theo permission leaf.

## 1. Route & màn hình

Thêm vào `src/app/routeRegistry.tsx`:

| Path | Element | layout | gate | nav |
|---|---|---|---|---|
| `/question-banks` | `QuestionBankListPage` | admin | `requiredPermissions: ["question.bank.manage"]` | `{ label: "Kho câu hỏi", icon: <DatabaseOutlined />, group: "Nhân sự" }` |
| `/question-banks/:bankId` | `QuestionBankDetailPage` | admin | `requiredPermissions: ["question.bank.manage"]` | — |

- **QuestionBankListPage**:
  - `Table` cột: STT, Tên (`title`, sorter), Mô tả (`description`), Số ảnh (`itemCount`),
    Trạng thái (`status` → `Tag`), Ngày tạo (`createdAt`), Thao tác (Xem / Xoá).
  - Toolbar: `Input` tìm theo `title`/`description` (client-side, `useSearchParams`) + nút
    "Làm mới" + `<Can permissions={["question.bank.manage"]}>` nút "Tạo kho câu hỏi" (mở modal).
  - Row `onClick` → `navigate('/question-banks/{id}')`. Xoá kho → `Modal.confirm okType="danger"`.
  - States: skeleton (load đầu), `Empty` (rỗng / không khớp filter), `Alert` (lỗi + Thử lại).
- **QuestionBankDetailPage** (route `:bankId`):
  - Header: `title`/`description`/`status` (Tag), nút "Làm mới" + "Xoá kho" (danger, `<Can>`).
  - **BankImageDropzone**: `Upload.Dragger` (`directory` + `multiple`, `accept=".webp,.png,.jpg,.jpeg"`,
    `showUploadList={false}`, `beforeUpload` trả `false`) — gom `File[]` vào state, lọc theo
    ext/mime, cap ~50 (cảnh báo khi vượt / file lạ). Nút "Tải lên & giải" → `useUploadBankImages`
    với `Progress` bám `onUploadProgress`. Xong → clear batch; item PENDING mới hiện nhờ invalidate/poll.
  - Lưới `Row/Col` các **QuestionItemCard** từ `useQuestionBankDetail` (poll khi còn PENDING):
    thumbnail `Image` (Cloudinary, lazy, trong `Image.PreviewGroup`), status `Tag`, danh sách
    câu hỏi/lời giải/giải thích khi SOLVED, spinner khi PENDING, ghi chú khi FAILED; nút
    "Giải lại" (`useResolveItem`) + "Xoá" (`Popconfirm` danger) bọc `<Can>`.
  - Còn item PENDING → `Alert` "đang xử lý N ảnh…"; quá ~90s vẫn PENDING → đổi copy (stale) nhưng
    KHÔNG dừng poll (ý tưởng `AI_JOB_STALE_MS`).

## 2. Permission gates

- Route `/question-banks`, `/question-banks/:bankId`: `requiredPermissions: ["question.bank.manage"]`
  → thiếu = `/403` (PermissionRoute). Nav "Kho câu hỏi" chỉ hiện khi có leaf (NavMenu tự lọc).
- Mọi mutation (tạo/xoá kho, upload, giải lại, xoá item): bọc `<Can permissions={["question.bank.manage"]}>`
  — người không có leaf không thấy nút trong DOM.
- **KHÔNG role gating** (`role === "ADMIN"`) — chỉ permission leaf.

## 3. API contract tiêu thụ (`coreClient` = `/api/v1`, envelope `{code,message,data}`)

> Client `src/features/question-bank/api/questionBank.api.ts` dùng **`coreClient`** (KHÔNG `apiClient`).
> Interceptor đã bóc envelope → hook đọc thẳng `res.data`. `isEnvelopeSuccess` coi `1002` là
> success nên POST giải-async trả job envelope vẫn qua.

| Method | Path | Quyền | Request | Response `data` |
|---|---|---|---|---|
| POST | `/question-banks` | question.bank.manage | `{ title, description? }` | `QuestionBankView` |
| GET | `/question-banks` | question.bank.manage | — | `QuestionBankView[]` (owner-scoped) |
| GET | `/question-banks/{id}` | question.bank.manage | — | `QuestionBankDetail { bank, items }` |
| POST | `/question-banks/{id}/images` | question.bank.manage | multipart `files[]` (~≤50 webp/png/jpg) | `QuestionItemView[]` (item PENDING) |
| POST | `/question-banks/{id}/items/{itemId}/resolve` | question.bank.manage | — | `QuestionItemView` |
| DELETE | `/question-banks/{id}` | question.bank.manage | — | `void` |
| DELETE | `/question-banks/{id}/items/{itemId}` | question.bank.manage | — | `void` |

DTO (theo mô tả BE đã ship):

```ts
type QuestionItemStatus = "PENDING" | "SOLVED" | "FAILED";
interface SolvedQuestion { question: string; answer: string; explanation: string }
interface QuestionBankView {
  id: string; title: string; description?: string; ownerId: string;
  itemCount: number; status: string; createdAt: string;
}
interface QuestionItemView {
  id: string; bankId: string; imageUrl: string; mime: string;
  status: QuestionItemStatus; questions: SolvedQuestion[];
  rawText?: string; model?: string; sortOrder: number; createdAt: string;
}
interface QuestionBankDetail { bank: QuestionBankView; items: QuestionItemView[] }
```

- **Multipart header override** (điểm quan trọng nhất): default instance của `coreClient` là
  `Content-Type: application/json`, sẽ phá `FormData`. Hook upload truyền per-request
  `headers: { "Content-Type": undefined }` để axios/browser tự set boundary multipart; kèm
  `timeout: 120000` + `onUploadProgress`.

## 4. State & data

- Query-key factory `src/features/question-bank/api/questionBank.keys.ts`:
  ```ts
  export const questionBankKeys = {
    all: ["question-bank"] as const,
    lists: () => [...questionBankKeys.all, "list"] as const,
    details: () => [...questionBankKeys.all, "detail"] as const,
    detail: (id: string | undefined) =>
      id ? [...questionBankKeys.details(), id] as const : questionBankKeys.details(),
  };
  ```
- `useQuestionBanks()` — `useQuery` `placeholderData` keep-previous; lọc client-side (owner-scoped,
  BE không doc filter/paging server).
- `useQuestionBankDetail(bankId)` — `refetchInterval: (q) => q.state.data?.items.some(i => i.status === "PENDING") ? 3000 : false`
  + `refetchIntervalInBackground: false` (dừng-khi-terminal như `useRunningTasks`/`nextPollInterval`).
- Mutations: `useCreateQuestionBank`, `useUploadBankImages(bankId)`, `useResolveItem(bankId)`,
  `useDeleteBank`, `useDeleteItem(bankId)` — onSuccess invalidate `lists()` + `detail(bankId)`;
  lỗi qua `handleAdminMutationError`.
- Predicate poll (`hasPendingItems`) + `STATUS_LABEL/STATUS_COLOR` + date formatter tách ra
  `format.ts` (pure, unit-testable) như `payroll/format.ts` + `useAiJobPolling`.

## 5. Luồng nghiệp vụ chính

1. **Tạo kho**: `/question-banks` → "Tạo kho câu hỏi" → modal `{title, description?}` → `POST
   /question-banks` → invalidate list + (tuỳ) điều hướng sang kho mới.
2. **Tải lô ảnh**: mở kho → kéo-thả thư mục ảnh → dropzone lọc/cap ~50 → "Tải lên & giải" →
   `POST /{id}/images` (multipart, progress) → item PENDING → invalidate detail → poll bắt đầu.
3. **Poll tới terminal**: detail poll 3s khi còn PENDING; mỗi item SOLVED render câu hỏi/lời
   giải/giải thích, FAILED hiện ghi chú + "Giải lại"; hết PENDING → poll dừng.
4. **Giải lại / xoá item**: FAILED (hoặc muốn giải lại) → `POST .../items/{itemId}/resolve` →
   item về PENDING → poll fold lại. Xoá item → `Popconfirm danger` → `DELETE .../items/{itemId}`.
5. **Xoá kho**: list/detail → `Modal.confirm danger` → `DELETE /{id}` → về list.
6. **Thiếu quyền**: không có `question.bank.manage` → nav ẩn, route `/403`, nút không render;
   nếu vẫn gọi API bị BE 403 → `ForbiddenError` → message "không có quyền".

## 6. UX states

- Loading: `Skeleton`/`Table loading` (list), `Skeleton`/`Spin` (detail + item PENDING).
- Empty: kho rỗng → `Empty`; kho chưa có ảnh → gợi ý kéo-thả.
- Error: `Alert`/`notification.error` từ `adminErrorMessage`.
- Confirm-on-destructive: xoá kho / xoá item → `Modal.confirm`/`Popconfirm` `okType="danger"`.
- Ảnh Cloudinary: `loading="lazy"` + `Image.PreviewGroup`; URL hỏng degrade gracefully.
- Ngày `toLocaleDateString('vi-VN')`; chuỗi UI inline tiếng Việt (theo convention payroll/quiz).

## 7. errors.ts — thêm mã

Thêm vào `ADMIN_ERROR_MESSAGES` (`src/shared/api/errors.ts`):
```
QUESTION_BANK_NOT_FOUND: "Không tìm thấy kho câu hỏi tương ứng.",
QUESTION_BANK_FORBIDDEN: "Bạn không có quyền thao tác trên kho câu hỏi này.",
QUESTION_BANK_ITEM_NOT_FOUND: "Không tìm thấy ảnh/câu hỏi tương ứng trong kho.",
QUESTION_BANK_UPLOAD_INVALID: "Tệp không hợp lệ — chỉ nhận ảnh webp/png/jpg (tối đa 50 ảnh).",
QUESTION_BANK_AI_FAILED: "AI chưa giải được ảnh này. Hãy thử \"Giải lại\".",
```

## 8. Ranh giới (out of scope repo này)

- Pipeline AI async (FtesAiContentClient sibling RestClient ~120s read timeout, Cloudinary
  upload, Kafka outbox/consumer hoặc @Async, `POST /api/ai/v2/vision/solve` header
  `X-AI-Integration-Secret`) là việc Java trong `FTES-AOS-Backend` + `ftes-ai-service`, KHÔNG
  thuộc các file React này. FE chỉ quan sát vòng đời PENDING→SOLVED/FAILED.
- Seed leaf `question.bank.manage` (ADMIN/SUPER_ADMIN + role staff) là việc BE — nếu chưa seed,
  nav/route ẩn và mọi call 403; FE không thể bù.
