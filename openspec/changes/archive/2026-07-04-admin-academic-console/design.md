# Design — admin-academic-console

## 1. Route & màn hình

| Route | Page component | Nội dung chính |
|---|---|---|
| `/academic/subjects` | `SubjectListPage` | Bảng subject server-side (search mã/tên, filter status/lecturer), nút tạo |
| `/academic/subjects/:id` | `SubjectDetailPage` | Tabs: Thông tin, Learning outcomes, Prerequisites, Nhân sự (lecturer/moderator), Resources của môn |
| `/academic/courses` | `CourseListPage` | Bảng course server-side (search tên, filter subject/status/lecturer), nút tạo |
| `/academic/courses/:id` | `CourseDetailPage` | Tabs: Tổng quan, Nội dung (tree editor), Pricing & Packages, Publish |
| `/academic/resources` | `ResourceListPage` | Bảng resource server-side (filter subject/type/status, search tên), upload mới |
| `/academic/resources/review` | `ResourceReviewQueuePage` | Hàng đợi pending: preview + approve/reject |
| `/academic/resources/:id` | `ResourceDetailPage` | Metadata, license/visibility, tab Versions |
| `/academic/packs` | `PackListPage` | Bảng Learning Pack server-side, nút tạo |
| `/academic/packs/:id` | `PackDetailPage` | Thông tin pack + danh sách item (course/resource) sắp thứ tự kéo thả |
| `/academic/quiz-bank` | `QuizBankPage` | Bảng câu hỏi server-side (filter subject/tag/độ khó/trạng thái), CRUD + import |

Feature folder `src/features/academic/` chia sub-module: `subjects/`, `courses/`,
`resources/`, `packs/`, `quiz/` — mỗi module có `pages/`, `api/`, `components/`.

Thành phần đáng chú ý:
- `CourseTreeEditor` (tab Nội dung): AntD Tree kéo thả 3 cấp section → lesson →
  assignment; panel phải edit node đang chọn; nút thêm node theo cấp; xoá node có confirm.
- `ResourceReviewQueue`: list pending trái, preview phải, form approve/reject (lý do
  bắt buộc khi reject).
- `ScopePicker` (CTV): khi user có nhiều scoped grant subject, chọn scope hiện hành
  (lưu Zustand), mọi query resource gắn `subjectId` scope.

## 2. Permission gates

| Permission leaf | Gate | Khi thiếu |
|---|---|---|
| `subject.view` | Nav "Môn học", route subjects | Ẩn nav; URL trực tiếp → 403 |
| `subject.create` / `subject.update` / `subject.delete` | Nút tạo / sửa / xoá subject | Nút ẩn |
| `subject.assign_staff` | Tab Nhân sự — thao tác gán lecturer/moderator | Tab chỉ đọc, nút gán ẩn |
| `course.view` | Nav "Khoá học", route courses | Ẩn nav; URL → 403 |
| `course.create` / `course.update` | Nút tạo / toàn bộ thao tác edit (tree, pricing) | Nút ẩn; detail chỉ đọc |
| `course.publish` | Nút "Publish" / "Unpublish" ở tab Publish | Nút ẩn, vẫn xem được trạng thái workflow |
| `resource.view` | Nav "Học liệu", route resources | Ẩn nav; URL → 403 |
| `resource.create` / `resource.update` | Upload mới / sửa metadata, tạo version | Nút ẩn |
| `resource.approve` | Route `/academic/resources/review` + nút approve/reject | Ẩn nav mục Review; URL → 403 |
| `resource.delete` | Nút xoá resource | Nút ẩn |
| `pack.view` / `pack.manage` | Nav "Learning Pack" / thao tác CRUD-sắp xếp | Ẩn nav hoặc chỉ đọc |
| `quiz.view` / `quiz.manage` | Nav "Quiz bank" / CRUD + import | Ẩn nav hoặc chỉ đọc |

CTV scoped (`ctv-resource`):
- Grant dạng `{permission: 'resource.view'|'resource.create'|'resource.update', scopeType: 'subject', scopeId}`.
- BE tự filter data theo scope; FE thêm: `ScopePicker` khi >1 scope, mọi list resource
  ép filter subject = scope hiện hành, không cho bỏ filter đó.
- CTV KHÔNG bao giờ có `resource.approve` → mục Review không render; version do CTV
  tạo vào trạng thái `pending` chờ duyệt.

## 3. API contract tiêu thụ

Envelope `{code, message, data|null}`, base `/api/v1/admin`. **Toàn bộ là assumption**
(BE `admin-api` chưa chốt chi tiết cho academic) — FE cô lập mapping trong `api/` từng module.

### Subjects

| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/subjects` | `subject.view` | query `search,status,lecturerId,page,pageSize,sortBy,sortOrder` → `{items,total}` |
| GET | `/subjects/:id` | `subject.view` | kèm `outcomes[]`, `prerequisites[]`, `staff[]` |
| POST | `/subjects` | `subject.create` | `{code,name,description}` |
| PUT | `/subjects/:id` | `subject.update` | cập nhật thông tin + `outcomes[]` |
| DELETE | `/subjects/:id` | `subject.delete` | 409 nếu còn course/resource tham chiếu |
| PUT | `/subjects/:id/prerequisites` | `subject.update` | `{subjectIds[]}` — BE trả 422 nếu tạo vòng lặp |
| PUT | `/subjects/:id/staff` | `subject.assign_staff` | `{lecturerIds[], moderatorIds[]}` |

### Courses

| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/courses` | `course.view` | query `search,subjectId,status,lecturerId,page,...` |
| GET | `/courses/:id` | `course.view` | kèm `tree` (sections→lessons→assignments), `pricing`, `workflowStatus` |
| POST | `/courses` | `course.create` | `{subjectId,name,summary}` → draft |
| PUT | `/courses/:id` | `course.update` | thông tin chung |
| PUT | `/courses/:id/tree` | `course.update` | full tree replace `{sections:[{id?,title,lessons:[{id?,title,assignments:[...]}]}]}`; BE trả tree đã persist (id mới) |
| PUT | `/courses/:id/pricing` | `course.update` | `{basePrice, packages:[{id?,name,price,entitlements[]}]}` |
| POST | `/courses/:id/publish` | `course.publish` | `{note}` — 422 nếu thiếu điều kiện (tree rỗng, pricing thiếu) kèm danh sách lỗi |
| POST | `/courses/:id/unpublish` | `course.publish` | `{reason}` bắt buộc |

### Resources

| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/resources` | `resource.view` (scoped cho CTV) | query `subjectId,type,status,search,page,...` — BE ép scope CTV |
| GET | `/resources/:id` | `resource.view` | kèm `license`, `visibility`, `currentVersion` |
| POST | `/resources` | `resource.create` | multipart upload + metadata `{subjectId,type,title,license,visibility}` → status `pending` |
| PUT | `/resources/:id` | `resource.update` | metadata/license/visibility; CTV sửa → về `pending` |
| POST | `/resources/:id/versions` | `resource.update` | upload version mới → version `pending` |
| GET | `/resources/:id/versions` | `resource.view` | lịch sử version `{items:[{version,status,createdBy,createdAt}]}` |
| POST | `/resources/:id/versions/:ver/restore` | `resource.update` | restore về version cũ (tạo version mới) |
| GET | `/resources/review-queue` | `resource.approve` | pending items, query `subjectId,type,page,...` |
| POST | `/resources/:id/approve` | `resource.approve` | `{note?}` |
| POST | `/resources/:id/reject` | `resource.approve` | `{reason}` bắt buộc |
| DELETE | `/resources/:id` | `resource.delete` | confirm + audit |

### Packs & Quiz

| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| GET/POST | `/packs` | `pack.view`/`pack.manage` | list server-side / tạo |
| GET/PUT/DELETE | `/packs/:id` | `pack.view`/`pack.manage` | detail / sửa / xoá |
| PUT | `/packs/:id/items` | `pack.manage` | `{items:[{type:'course'|'resource', refId, order}]}` |
| GET | `/quiz-questions` | `quiz.view` | query `subjectId,tag,difficulty,status,search,page,...` |
| POST/PUT/DELETE | `/quiz-questions(/:id)` | `quiz.manage` | CRUD câu hỏi |
| POST | `/quiz-questions/import` | `quiz.manage` | upload file → `{jobId}` → poll kết quả `{imported, errors[]}` |

## 4. State & data

Query keys (factory per module):

- `['admin','subjects','list',params]`, `['admin','subjects','detail',id]`
- `['admin','courses','list',params]`, `['admin','courses','detail',id]`
- `['admin','resources','list',params]`, `['admin','resources','detail',id]`,
  `['admin','resources','versions',id]`, `['admin','resources','review-queue',params]`
- `['admin','packs','list',params]`, `['admin','packs','detail',id]`
- `['admin','quiz','list',params]`, `['admin','quiz','import',jobId]`

Invalidation: mutation nào ghi entity nào → invalidate detail + list module đó;
approve/reject → invalidate review-queue + resource detail/list; publish →
invalidate course detail + list; save tree → setQueryData từ response (tránh refetch to).

Zustand:
- `ctvScopeStore`: `{scopes[], activeScopeId, setActive}` — hydrate từ scoped grants
  sau login; persist sessionStorage.
- `courseTreeDraftStore`: draft tree đang edit (node đang chọn, dirty flag) — cảnh báo
  rời trang khi dirty (`beforeunload` + route blocker).

## 5. Luồng nghiệp vụ chính

### Flow A — Biên tập tree khoá học
1. Admin có `course.update` mở tab Nội dung → tree render từ `detail.tree`.
2. Kéo thả/thêm/sửa/xoá node trong draft store (chưa gọi API); xoá node có confirm
   nêu số node con bị xoá theo.
3. Bấm "Lưu nội dung" → `PUT /courses/:id/tree` full tree; loading khoá editor.
4. Thành công → thay draft bằng tree persist (id thật), dirty=false. Lỗi 422 →
   hiển thị lỗi từng node (map theo path); lỗi mạng → giữ draft, cho retry.

### Flow B — Publish khoá học
1. Tab Publish hiển thị workflow: draft → review → published + checklist điều kiện
   (có section/lesson, có pricing, có mô tả).
2. Admin có `course.publish` bấm "Publish" → confirm nêu hệ quả ("Khoá hiện ra với
   học viên, giá có hiệu lực").
3. `POST /courses/:id/publish`; 422 → render danh sách điều kiện thiếu ngay trong tab;
   thành công → badge Published, audit ghi bởi BE.
4. Unpublish yêu cầu lý do bắt buộc + confirm tương tự.

### Flow C — CTV upload học liệu & duyệt
1. CTV (scoped subject S) vào `/academic/resources` → ScopePicker chọn S nếu nhiều scope;
   list chỉ có resource của S.
2. CTV upload resource mới → status `pending`; CTV KHÔNG thấy nút approve/mục Review.
3. Moderator/admin có `resource.approve` vào `/academic/resources/review` → preview →
   Approve (note tuỳ chọn) hoặc Reject (lý do bắt buộc).
4. Approve → status `approved`, hiện với học viên theo visibility; Reject → CTV thấy
   lý do trên resource detail, sửa và resubmit tạo version pending mới.
5. CTV cố mở URL `/academic/resources/review` → 403; gọi API approve → BE 403.

### Flow D — Prerequisites có vòng lặp
1. Admin sửa prerequisites subject A, chọn B (mà B đã yêu cầu A).
2. `PUT /subjects/:id/prerequisites` → BE 422 kèm chuỗi vòng lặp.
3. FE hiển thị lỗi "Tạo vòng phụ thuộc: A → B → A", không lưu, giữ selection cho sửa.

## 6. UX states

- **Loading**: mọi list → skeleton bảng; course detail → skeleton mirror (header +
  tab + tree trái/panel phải); review queue → skeleton 2 cột.
- **Empty**: list rỗng → empty state kèm CTA đúng quyền (vd "Tạo môn học" chỉ hiện khi
  `subject.create`); review queue trống → "Không còn học liệu chờ duyệt".
- **Error**: query lỗi → Alert + retry; 403 → Forbidden page kèm permission thiếu;
  422 → lỗi field-level (form) hoặc node-level (tree) hoặc checklist (publish).
- **Confirm-on-destructive**: xoá subject/course node/resource/pack/câu hỏi, publish/
  unpublish, approve/reject, restore version — confirm nêu hệ quả; reject/unpublish/
  xoá subject bắt buộc lý do; tất cả audit bởi BE.
- **Dirty guard**: tree editor và form dài chặn điều hướng khi chưa lưu.
