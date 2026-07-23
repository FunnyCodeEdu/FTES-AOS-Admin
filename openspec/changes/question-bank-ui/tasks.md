# Tasks — question-bank-ui

## 1. Feature scaffold
- [ ] 1.1 Tạo folder `src/features/question-bank/` (pages/ api/ components/ types).
- [ ] 1.2 `types.ts`: `QuestionItemStatus`, `SolvedQuestion`, `QuestionBankView`,
  `QuestionItemView`, `QuestionBankDetail`, `CreateBankInput` (theo BE DTO).

## 2. API layer (coreClient — /api/v1)
- [ ] 2.1 `api/questionBank.keys.ts`: query-key factory (`all`/`lists`/`details`/`detail`).
- [ ] 2.2 `api/questionBank.api.ts` (dùng `coreClient`, KHÔNG `apiClient`):
  - `useQuestionBanks()` GET `/question-banks` (`placeholderData` keep-previous).
  - `useQuestionBankDetail(bankId)` GET `/question-banks/{id}` với
    `refetchInterval` = 3s khi còn item PENDING, `false` khi terminal; `refetchIntervalInBackground:false`.
  - `useCreateQuestionBank()` POST `/question-banks`.
  - `useUploadBankImages(bankId)` POST `/question-banks/{id}/images` — `FormData` field `files[]`,
    per-request `headers: { "Content-Type": undefined }`, `timeout: 120000`, `onUploadProgress`.
  - `useResolveItem(bankId)` POST `.../items/{itemId}/resolve`.
  - `useDeleteBank()` DELETE `/question-banks/{id}`.
  - `useDeleteItem(bankId)` DELETE `.../items/{itemId}`.
  - Mọi mutation: onError `handleAdminMutationError`; onSuccess invalidate `lists()` + `detail(bankId)`.

## 3. Format helpers
- [ ] 3.1 `format.ts`: `STATUS_LABEL`/`STATUS_COLOR` (PENDING cam / SOLVED xanh / FAILED đỏ),
  `hasPendingItems(items)` (predicate poll), `formatDate` — pure, unit-testable.

## 4. Pages
- [ ] 4.1 `pages/QuestionBankListPage.tsx`: server-table pattern (`useSearchParams`↔filter,
  skeleton/empty/error) + cột (title/description/itemCount/status Tag/createdAt/thao tác) +
  nút "Tạo kho câu hỏi" bọc `<Can>` → `CreateBankModal`; xoá kho `Modal.confirm okType="danger"`;
  row click → detail.
- [ ] 4.2 `pages/QuestionBankDetailPage.tsx`: header + `BankImageDropzone` + lưới `QuestionItemCard`
  từ `useQuestionBankDetail` (poll); Alert "đang xử lý N ảnh…" + copy stale sau ~90s không dừng poll.
- [ ] 4.3 `components/CreateBankModal.tsx`: `Form`-in-`Modal` `{title, description?}` →
  `useCreateQuestionBank`; success đóng + `message.success` + (tuỳ) điều hướng.
- [ ] 4.4 `components/BankImageDropzone.tsx`: `Upload.Dragger` (directory/multiple), `beforeUpload`
  trả `false`, gom `File[]`, lọc webp/png/jpg + cap ~50 (cảnh báo), "Tải lên & giải" →
  `useUploadBankImages` + `Progress`.
- [ ] 4.5 `components/QuestionItemCard.tsx`: `Image` thumbnail (lazy, `Image.PreviewGroup`),
  status `Tag`, câu hỏi/lời giải/giải thích khi SOLVED, spinner khi PENDING, ghi chú FAILED;
  nút "Giải lại"/"Xoá" bọc `<Can>` (`Popconfirm`/`Modal.confirm` danger cho xoá).

## 5. Permission & dangerous-action
- [ ] 5.1 Route gate `requiredPermissions: ["question.bank.manage"]`; nút quản lý gate cùng leaf qua `<Can>`.
- [ ] 5.2 Xoá kho / xoá item → `Modal.confirm`/`Popconfirm` `okType="danger"` nêu hệ quả.
- [ ] 5.3 `src/shared/api/errors.ts`: thêm `QUESTION_BANK_NOT_FOUND`, `QUESTION_BANK_FORBIDDEN`,
  `QUESTION_BANK_ITEM_NOT_FOUND`, `QUESTION_BANK_UPLOAD_INVALID`, `QUESTION_BANK_AI_FAILED`.

## 6. Routes
- [ ] 6.1 `src/app/routeRegistry.tsx`: import icon + 2 page; thêm `/question-banks`
  (nav `{label:"Kho câu hỏi", group:"Nhân sự"}`, `question.bank.manage`) + `/question-banks/:bankId`.

## 7. Verify
- [ ] 7.1 `npx tsc --noEmit` sạch + `npm run build` (`tsc -b && vite build`) xanh.
- [ ] 7.2 e2e tay (account có `question.bank.manage`): tạo kho → kéo-thả ~ vài ảnh → item PENDING
  → poll tới SOLVED/FAILED → giải lại item FAILED → xoá item → xoá kho. Account thiếu leaf:
  không thấy nav "Kho câu hỏi", vào route bị `/403`.
