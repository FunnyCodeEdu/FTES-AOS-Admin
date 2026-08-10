## Why

Trang chi tiết event ở `/operations/events/:id` không hiện MỘT nút hành động nào. Suốt buổi điều tra tôi
đi nhầm hướng RBAC (nghi lệch permission catalog, nghi bypass SUPER_ADMIN). Bằng chứng thật lại nằm chỗ khác
và tất định — xảy ra với MỌI event, bất kể quyền.

**Gốc: lệch hoa/thường của `event.status`.** BE canonical là CHỮ HOA
(`DRAFT → PENDING_APPROVAL → PUBLISHED → ONGOING → ENDED`; `CANCELLED`), còn `EventDetailPage` so chữ thường
(`event.status === "draft"`). Bằng chứng quyết định: resolver `AdminContentReadController#adminEvent` hạ chữ
thường cho `mode` ở dòng 280, rồi truyền `e.status()` NGUYÊN VĂN ở dòng 285 — cùng một lời gọi constructor,
một field được chuẩn hoá còn field kia bị bỏ sót. Phía FE thì `status: item.status as OfficialEvent["status"]`
là cast TypeScript **không sinh mã runtime**, nên `"DRAFT"` lọt thẳng vào so sánh. Bốn nhánh điều kiện đều
false ⇒ `<Space>` render rỗng ⇒ 0 nút.

**Union `OfficialEventStatus` còn sai về TẬP GIÁ TRỊ**, không chỉ hoa/thường: nó bịa ra `"completed"` (BE
không có, trạng thái kết thúc tên là `ENDED`) và bỏ sót `"pending_approval"` — trạng thái ngay sau khi gửi
duyệt. Type system đang bảo chứng cho một hợp đồng sai.

**Kéo theo một bug im lặng khác:** `EventRepository.searchAdmin` so khớp nguyên văn (`e.status = :status`)
trên dữ liệu CHỮ HOA, nên filter status/type gửi chữ thường của FE **luôn trả 0 dòng**.

**Và hai nút mã chết:** "Start"/"Complete" gọi `useTransitionEvent` với đích không được hỗ trợ (hàm này chỉ
ánh xạ submit/cancel) nên bấm vào chỉ nhận lỗi đỏ. `ONGOING`/`ENDED` do scheduler BE chuyển, không phải thao
tác admin.

Ngoài ra, `graphqlRequest` không có nhánh 401 nào trong khi axios (`client.ts:165`) có refresh+retry — nên
mọi trang đọc bằng GraphQL chết ngay khi access token hết hạn, kể cả `me`; `me` chết thì `permissions` rỗng và
mọi `<Can>` biến mất. Đo được tận tay: `query Me → 401 PLATFORM_UNAUTHORIZED`.

## What Changes

- **`toEventStatus()` — biên dịch runtime** ở đúng biên API, dùng ở cả hai chỗ map (list + detail), thay cho
  cast trần. Giá trị lạ → fallback `draft` kèm `console.warn`, không nuốt im lặng.
- **`toBackendEnum()` cho filter** đi ngược lên CHỮ HOA (status + type).
- **Union `OfficialEventStatus` khớp BE 1-1**: bỏ `completed`, thêm `pending_approval` và `ended`.
- **`EventDetailPage` chỉ phơi hành động admin CÓ THẬT**: "Gửi duyệt" (không phải "Publish" — endpoint là
  `POST /submit`, đưa sang `PENDING_APPROVAL`) và "Huỷ event". Nút huỷ mirror đúng guard BE (`EventService.cancel`
  từ chối khi đã bắt đầu) nên disable + tooltip thay vì hiện ra để nhận lỗi.
- **`graphqlRequest` refresh 401**: dùng chung mutex single-flight với axios, retry đúng một lần.
- **`Can`/`NavMenu`/`PermissionRoute` đọc cờ `superAdmin`** mới có trên GraphQL `Viewer` (đi kèm change BE
  `rbac-superadmin-surface`), để SUPER_ADMIN không bị ẩn sạch UI.
- **Sửa hook-order crash** ở `EventDetailPage`: `useMemo` đứng sau `if (isLoading) return` khiến React ném
  "Rendered more hooks than during the previous render" mỗi lần tải xong.

## Impact

- Affected specs: `operations-official-events` (MODIFIED).
- Affected code: `features/operations/*`, `shared/api/graphql.ts`, `shared/permissions/*`, `features/auth/api.ts`.
- Không nới quyền: gate vẫn là `<Can permissions={["event.manage"]}>`; chỉ sửa điều kiện render theo trạng thái
  và bổ sung đúng cờ bypass mà BE vốn đã thi hành.

## Non-goals

- Không sửa resolver BE để hạ chữ thường `status`: chuẩn hoá đặt ở biên FE, cùng chỗ với `toEventType`.
- Không thêm UI duyệt (approve) — xem phần bỏ ngỏ trong tasks.md.
