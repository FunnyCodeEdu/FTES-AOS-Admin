## Why

Mỗi môn học là một "workplace" (`/subjects/{code}`). Hai hợp đồng cross-repo cần admin phục vụ:

- **A — Ảnh bìa môn**: `subject.subjects` có thêm `imageUrl` (string|null) mà BE trả ở subject
  detail + workspace read; FE render lên header workspace. Admin phải **đặt/xoá** được ảnh bìa
  này, gated `subject.manage`.
- **B — Học liệu khoá theo mua**: `Resource.visibility` do BE `VisibilityGuard` canh. BE định nghĩa
  giá trị **`ENROLLED_ONLY`** (enum RIÊNG, khác `MEMBERS`) mang nghĩa "chỉ học viên đã mua/ghi danh
  khoá gắn môn"; FE vocab `enrolled` map sang đúng `ENROLLED_ONLY`. FE learn/subject hiện lock badge
  + đẩy sang luồng mua khi BE trả `lockedForViewer=true`.

Hiện admin CHƯA có control đặt ảnh bìa môn, và luồng học liệu map visibility SAI: `enrolled` đang trỏ
`MEMBERS` thay vì `ENROLLED_ONLY` → đặt "chỉ người đã mua" ghi nhầm tầng. Ngoài ra list học liệu
(GraphQL `adminResources`) trả visibility THÔ dạng UPPERCASE enum nên nhãn cột lệch với trang detail.

## What Changes

- **Ảnh bìa môn (A)**: thêm control ảnh bìa (URL đã tải sẵn qua image provider — cách nhẹ rủi ro nhất,
  đồng nhất với Banner) vào tab Thông tin (`SubjectInfoTab`), có preview trực tiếp. QUAN TRỌNG: `imageUrl`
  CHỈ có trên endpoint **CORE theo CODE** (`GET/PATCH /api/v1/subjects/{code}`, `SubjectCatalogController`),
  KHÔNG có trên admin path `/admin/subjects/{id}` → đọc/ghi ảnh bìa đi qua `coreClient` theo CODE (giống
  prerequisites/staff), gate `subject.manage`. Ô rỗng → gửi chuỗi rỗng `""` để xoá (BE chỉ set khi
  `imageUrl != null`, gửi null bị bỏ qua).
- **Visibility "đã mua" (B)**: `enrolled` → **`ENROLLED_ONLY`** (sửa từ `MEMBERS`) ở luồng TẠO
  (`useCreateResource` → POST `/resources`). Chuẩn hoá đọc list: BE→FE visibility (`beVisibilityToFe`)
  cho `useResources`/`useReviewQueue` để nhãn cột khớp trang detail (`ENROLLED_ONLY`→`enrolled`). Nhãn
  dùng chung 1 constant (`RESOURCE_VISIBILITY_LABELS`/`_OPTIONS`) nói rõ ngữ nghĩa khoá.
  - Giới hạn BE (ngoài worktree): admin PATCH `/admin/resources/{id}` (`UpdateResourceBody`) CHƯA có
    field `visibility` → đổi visibility khi SỬA qua đường admin chưa hiệu lực; đặt "chỉ người đã mua"
    hiệu lực qua luồng TẠO. Hook update vẫn map+gửi visibility để forward-compatible (giá trị dư bị BE
    bỏ qua, an toàn).
- KHÔNG đụng BE (repo khác), KHÔNG đụng learn-rail (Contract C là FE-only ở repo web).

## Capabilities

### New Capabilities

- `subject-cover-image`: Admin đặt/cập nhật/xoá ảnh bìa môn (imageUrl) trong tab Thông tin qua endpoint
  CORE theo CODE, gate `subject.manage`.
- `resource-purchasers-only-visibility`: Admin đặt visibility học liệu = "chỉ học viên đã mua"
  (`enrolled`/`ENROLLED_ONLY`) khi tạo; nhãn + list nói rõ ngữ nghĩa khoá và hiển thị nhất quán.

## Impact

- **FE sửa**: `src/features/academic/types/index.ts` (Subject.imageUrl chú thích CORE-only; bỏ imageUrl
  khỏi SubjectFormValues), `subjects/api/subjects.keys.ts` (+cover key),
  `subjects/api/subjects.api.ts` (+`useSubjectCoverImage`/`useUpdateSubjectCover` qua coreClient theo CODE),
  `subjects/components/SubjectInfoTab.tsx` (control ảnh bìa + preview, gate subject.manage),
  `resources/constants.ts` (nhãn/option + chú thích ENROLLED_ONLY),
  `resources/components/ResourceFormModal.tsx` (dùng constant + helper text),
  `resources/api/resources.api.ts` (`enrolled→ENROLLED_ONLY` + `beVisibilityToFe` chuẩn hoá list),
  `resources/components/ResourceTable.tsx` + `resources/pages/ResourceDetailPage.tsx` (nhãn dùng chung).
- **Không đụng BE**. Verify `tsc --noEmit` + `npm run build` xanh.
