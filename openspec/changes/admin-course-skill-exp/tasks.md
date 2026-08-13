# Tasks — admin-course-skill-exp

## 1. Hợp đồng API + hook

- [x] 1.1 `courses.keys.ts`: thêm `skillCategories()` và `skillExp(courseId)` vào factory sẵn có
      (cùng namespace `["admin","courses"]` để invalidate theo `all` vẫn quét trúng).
- [x] 1.2 `courses.api.ts`: types `SkillCategory`, `CourseSkillExpRow`, `SkillExpSource`.
- [x] 1.3 `useSkillCategories()` — `GET /career/skill-categories` qua `coreClient` (KHÔNG dưới
      `/admin`), `staleTime` dài (danh mục ít đổi).
- [x] 1.4 `useCourseSkillExp(courseId)` — `GET /admin/courses/{id}/skill-exp` qua `coreClient`.
- [x] 1.5 `useEvaluateCourseSkillExp(courseId)` — `POST .../skill-exp/evaluate` **request/response
      thẳng**, KHÔNG dùng `useAiJobPolling` (BE gọi ai-service trong request; task 2.1 bên BE).
      `onError: handleAdminMutationError`.
- [x] 1.6 `useSaveCourseSkillExp(courseId)` — `PUT .../skill-exp` (replace-set), invalidate
      `skillExp(courseId)`, `onError: handleAdminMutationError`.

## 2. Helper thuần (test được, không dính React)

- [x] 2.1 `normalizeSkillCategories` — nhận mảng trần / `{items|categories|data}`, bỏ mục thiếu
      slug, sắp theo `sortOrder` rồi `label`.
- [x] 2.2 `normalizeSkillExpRows` — đọc `AllocationView` (kèm `categoryLabel`, `source`), chấp cả
      payload bọc `{items}`; ép EXP về số nguyên ≥ 0; khử trùng slug (giữ bản ghi đầu).
- [x] 2.3 `toSkillExpPayload(rows)` — replace-set `{items:[{categorySlug,exp,rationale}]}` (khoá
      **`items`** theo `ReplaceAllocationBody`), bỏ dòng EXP ≤ 0, rationale rỗng → `null`.
- [x] 2.4 `validateSkillExpRows(rows, categories)` — lỗi tiếng Việt phản chiếu ĐÚNG luật
      `replaceManual`: thiếu nhóm, trùng nhóm, EXP ngoài [1..1000], slug ngoài danh mục.
- [x] 2.8 `normalizeEvaluateResult` — tách `EvaluateResult` thành rows + `ignoredSlugs` +
      `clampedSlugs` (BE cố tình báo AI bịa gì; KHÔNG được nuốt).
- [x] 2.5 `milestoneBreakdown(exp)` — chia 30/50/80/100 **làm tròn xuống từng bước, mốc 100 lấy phần
      dư** (khớp BE task 3.3); tổng 4 phần luôn bằng `exp`.
- [x] 2.6 `availableCategoryOptions(categories, rows, currentSlug)` — chỉ nhóm chưa dùng (+ nhóm
      của chính dòng đang sửa).
- [x] 2.7 `rowsEqual(a, b)` — so bộ hiện tại với bộ đã lưu để tắt nút Lưu khi chưa đổi gì.

## 3. UI tab

- [x] 3.1 `CourseSkillExpTab.tsx`: khối copy nói rõ **AI đề xuất — người quyết**, và số nhập là EXP
      **toàn khoá**, trả dần ở 30/50/80/100%.
- [x] 3.2 Ô `Input.TextArea` dán syllabus + nút "Để AI chấm" (spinner + nút disabled khi đang chạy).
- [x] 3.3 Bảng sửa tay: cột Nhóm kỹ năng (Select) · EXP (InputNumber) · Chia theo mốc (read-only) ·
      Lý do (TextArea) · Xoá dòng; nút "Thêm nhóm"; nút "Lưu phân bổ" (disabled khi chưa đổi).
- [x] 3.4 Lỗi evaluate → `Alert` kèm lý do, **KHÔNG** chạm vào rows đang có (spec BE "Evaluation
      unavailable"); evaluate trả rỗng → cảnh báo, giữ nguyên bảng.
- [x] 3.5 Dòng có slug ngoài danh mục → vẫn hiện, gắn Tag "không có trong danh mục".
- [x] 3.6 GET phân bổ lỗi → KHOÁ mọi đường ghi (evaluate + PUT đều là replace-set; ghi lúc bảng
      trống vì lỗi tải sẽ đè mất phân bổ người dùng chưa hề thấy).
- [x] 3.7 Hiện `ignoredSlugs` / `clampedSlugs` sau khi AI chấm — admin phải biết AI bịa nhóm nào và
      con số nào bị kẹp về [1..1000].
- [x] 3.8 `src/shared/api/errors.ts`: thêm `CAREER_SKILL_EXP_AI_EMPTY` / `_NO_CATEGORY` /
      `_FORBIDDEN`, `CAREER_COURSE_NOT_FOUND`, `CAREER_SKILL_CATEGORY_DUPLICATE`. CỐ Ý bỏ
      `CAREER_SKILL_EXP_INVALID` — message BE mang chi tiết ("exp của devops phải trong [1..1000]"),
      dịch đè sẽ giấu mất.

## 4. Wiring

- [x] 4.1 `CourseDetailPage.tsx`: thêm tab `key: "skill-exp"`, label "EXP kỹ năng",
      `visible: canUpdate` (leaf `course.manage`, giống tab "Học viên").

## 5. Verify

- [x] 5.1 `openspec validate admin-course-skill-exp --strict` xanh.
- [x] 5.2 Unit vitest cho toàn bộ helper §2 (đặc biệt: tổng mốc = EXP cấu hình; evaluate lỗi không
      làm rỗng payload; khử trùng nhóm).
- [x] 5.3 `npm run typecheck` sạch + `npm run build` xanh.

## 6. Đã đối chiếu với bản implement của BE (không phải phỏng đoán)

Đọc `SkillExpDtos.java`, `AdminCourseSkillExpController.java`, `CareerSkillExpController.java`,
`CourseSkillExpService.java` bên FTES-AOS-Backend rồi sửa FE cho khớp:

- PUT nhận khoá **`items`** (ban đầu FE dựng `allocations` theo phỏng đoán → đã sửa, có test chốt).
- `AllocationView` có thêm `categoryLabel` → dùng để hiện nhãn cho nhóm không còn trong danh mục.
- `EvaluateResult` có `ignoredSlugs` / `clampedSlugs` → hiện lên UI.
- `exp` ∈ [1, 1000] (`MIN/MAX_EXP_PER_CATEGORY`) → InputNumber min/max + validate y hệt.
- Evaluate rỗng ⇒ 502 `CAREER_SKILL_EXP_AI_EMPTY` (không phải 200 rỗng) → nhánh "AI trả rỗng" của
  FE vẫn giữ làm lớp phòng vệ thứ hai, nhưng đường chính là Alert lỗi.
- `EvaluateBody` có field `model` (tuỳ chọn) — FE KHÔNG gửi, để BE tự chọn model.

## 7. Còn nợ / theo dõi

- BE `course-skill-exp` **chưa deploy** — tab chỉ chạy thật sau khi endpoint lên server.
- BE cho `career.manage` HOẶC `course.manage`; tab gác `course.manage` (theo các tab hàng xóm).
  Người chỉ có `career.manage` sẽ không thấy tab — nếu muốn mở, sửa ĐÚNG một dòng `visible` ở
  `CourseDetailPage`, nhưng cần cân nhắc: các tab khác của trang khoá đều đòi `course.manage`.
- Chưa có test render (chỉ test helper thuần) — repo này chưa dựng harness render cho tab.
