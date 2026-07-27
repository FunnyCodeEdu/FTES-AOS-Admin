## 1. Types

- [x] 1.1 `Subject.imageUrl?: string | null` (kế thừa sang `SubjectDetail`) chú thích BE lộ CORE-only;
  BỎ `imageUrl` khỏi `SubjectFormValues` (admin create/update body không mang imageUrl).

## 2. Ảnh bìa môn (Contract A)

- [x] 2.1 `subjects.keys.ts`: thêm key `cover(code)`.
- [x] 2.2 `subjects.api.ts`: `useSubjectCoverImage(code)` (GET CORE `/subjects/{code}` → imageUrl) +
  `useUpdateSubjectCover({id,code})` (PATCH CORE `/subjects/{code}` body `{imageUrl}`) qua `coreClient`
  theo CODE — vì admin path `/admin/subjects/{id}` KHÔNG mang imageUrl.
- [x] 2.3 `SubjectInfoTab`: control ảnh bìa (Input URL + preview + nút Lưu) trong `<Can subject.manage>`,
  init từ `useSubjectCoverImage`; ô rỗng → gửi `""` để xoá bìa (BE bỏ qua null).

## 3. Visibility "chỉ người đã mua" (Contract B)

- [x] 3.1 `resources.api.ts`: `VISIBILITY_TO_BE.enrolled` = `ENROLLED_ONLY` (sửa từ `MEMBERS`).
- [x] 3.2 `resources.api.ts`: `beVisibilityToFe` chuẩn hoá visibility BE (UPPERCASE) → FE vocab trong
  `useResources`/`useReviewQueue` để nhãn list khớp detail (`ENROLLED_ONLY`/`MEMBERS`→`enrolled`).
- [x] 3.3 `resources/constants.ts`: `RESOURCE_VISIBILITY_OPTIONS`/`_LABELS`, chú thích `enrolled`→`ENROLLED_ONLY`
  (khác `MEMBERS`).
- [x] 3.4 `ResourceFormModal`: dùng `RESOURCE_VISIBILITY_OPTIONS` + helper text.
- [x] 3.5 `useUpdateResource`: map+gửi visibility (forward-compatible) + chú thích rõ admin PATCH hiện bỏ
  qua visibility → đặt "chỉ người đã mua" hiệu lực qua luồng TẠO.
- [x] 3.6 `ResourceTable` + `ResourceDetailPage`: nhãn visibility tham chiếu `RESOURCE_VISIBILITY_LABELS`.

## 4. Verify

- [x] 4.1 `npx tsc --noEmit` sạch.
- [x] 4.2 `npm run build` xanh.
