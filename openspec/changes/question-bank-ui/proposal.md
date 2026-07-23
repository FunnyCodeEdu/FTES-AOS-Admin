# question-bank-ui — Kho câu hỏi (question bank) workplace cho staff

## Why

Nghiệp vụ mới: nhân sự (staff/admin) cần một "Kho câu hỏi" để tải hàng loạt **ảnh đề bài**
(chụp/scan, thả cả thư mục ~≤50 ảnh), hệ thống nén + up Cloudinary rồi gọi AI (ftes-ai-service
`POST /api/ai/v2/vision/solve`) để **bóc câu hỏi + lời giải + giải thích** từ mỗi ảnh. Vì một
lô 50 ảnh không thể giải đồng bộ trong 1 request, BE tạo item ở trạng thái `PENDING` rồi giải
bất đồng bộ → `SOLVED`/`FAILED`; FE phải **poll** tới khi mọi item terminal.

BE vừa ship bộ REST `/api/v1/question-banks` (envelope `{code,message,data}`) và seed leaf
`question.bank.manage` (ADMIN/SUPER_ADMIN + role staff). Admin v2 chưa có console nào tiêu thụ.
Cần feature mới, **gate theo permission leaf `question.bank.manage`** (KHÔNG role string —
CLAUDE.md cấm), theo đúng convention module admin hiện có (payroll: coreClient + query-key +
invalidation; quiz/resources: server-table + create-modal + AntD Upload; notifications /
useAiJobPolling: refetchInterval dừng khi terminal).

## What Changes

- **Console mới `/question-banks*`** (nhóm nav "Nhân sự"), layout `admin`:
  - `/question-banks` — **QuestionBankListPage**: bảng mọi kho caller quản lý (owner-scoped) +
    tìm kiếm client-side + nút "Tạo kho câu hỏi" (mở `CreateBankModal`) + xoá kho (danger confirm).
  - `/question-banks/:bankId` — **QuestionBankDetailPage**: header kho + **kéo-thả cả thư mục**
    ảnh (`Upload.Dragger` directory/multiple) với thanh Progress, lưới thẻ từng item (ảnh +
    câu hỏi/lời giải/giải thích khi SOLVED, spinner khi PENDING, ghi chú khi FAILED), **poll**
    detail mỗi 3s khi còn item PENDING → dừng khi terminal, nút "Giải lại"/"Xoá" từng item.
- **API client mới** `src/features/question-bank/api/questionBank.api.ts` dùng **`coreClient`**
  (`/api/v1`, KHÔNG `apiClient` `/api/v1/admin`). Upload gửi `FormData` với header per-request
  `Content-Type: undefined` để browser tự đặt multipart boundary; timeout ~120s; onUploadProgress.
- Query-key factory `questionBank.keys.ts`; mọi mutation invalidate `lists()` + `detail(id)`;
  map lỗi qua `handleAdminMutationError` + thêm mã `QUESTION_BANK_*` vào `src/shared/api/errors.ts`.
- Dangerous-action: xoá kho / xoá item dùng `Modal.confirm`/`Popconfirm` `okType="danger"`.
- Thêm route + nav vào `src/app/routeRegistry.tsx`.

## Capabilities

### New Capabilities
- `question-bank-ui`: staff/admin quản lý kho câu hỏi — tạo/xoá kho, tải lô ảnh đề bài
  (kéo-thả thư mục), AI bóc câu hỏi/lời giải bất đồng bộ, poll trạng thái từng item tới
  SOLVED/FAILED, giải lại + xoá item; gate `question.bank.manage`.

### Modified Capabilities
<!-- Không sửa capability sẵn có. -->

## Impact

- Route mới: `/question-banks` (nav, `question.bank.manage`), `/question-banks/:bankId`
  (`question.bank.manage`; thao tác cần cùng leaf, bọc `<Can>`).
- Feature folder mới `src/features/question-bank/**` (types, api, format, pages, components).
- API BE tiêu thụ (`coreClient`, `/api/v1`): `POST/GET /question-banks`, `GET /question-banks/{id}`,
  `POST /question-banks/{id}/images`, `POST /question-banks/{id}/items/{itemId}/resolve`,
  `DELETE /question-banks/{id}`, `DELETE /question-banks/{id}/items/{itemId}`.
- `src/shared/api/errors.ts` +mã lỗi `QUESTION_BANK_*`.
- RBAC leaf mới cần có ở BE + catalog: `question.bank.manage` (ADMIN/SUPER_ADMIN + role staff).
- Phụ thuộc BE ngoài repo này (FTES-AOS-Backend + ftes-ai-service): pipeline AI async
  (Cloudinary upload, Kafka/@Async, vision/solve) — FE chỉ quan sát vòng đời PENDING→SOLVED/FAILED.
