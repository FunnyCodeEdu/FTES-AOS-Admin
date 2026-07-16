# admin-lesson-exercise-authoring

## ADDED Requirements

### Requirement: Exercises tab lists all exercise types of a lesson
`LessonEditPage` SHALL có tab "Bài tập" hiển thị 3 section Quiz / Assignment / Challenge của lesson: quiz từ `GET /courses/lessons/{id}/quizzes?includeDrafts=true` (kèm status + questionCount), assignment từ `GET /courses/lessons/{id}/assignments`, challenge từ `GET /challenges` lọc theo `lessonId`; user thiếu quyền quản khoá SHALL thấy chế độ chỉ đọc (mirror `useCanManageCourse`).

#### Scenario: Lesson demo có đủ 3 loại
- **WHEN** admin mở tab Bài tập của lesson có 1 quiz DRAFT + 1 assignment + không challenge
- **THEN** section Quiz hiện 1 dòng tag DRAFT, Assignment 1 dòng, Challenge hiện empty state kèm nút thêm

#### Scenario: Chỉ đọc
- **WHEN** user không quản được course mở tab
- **THEN** mọi nút thêm/sửa/publish bị disable

### Requirement: Add-exercise modal picks a type
Nút "Thêm bài tập" SHALL mở modal chọn 1 trong 3 loại (Quiz trắc nghiệm / Assignment code GitHub / Challenge MCQ-CODE-ESSAY) rồi mở đúng form soạn tương ứng.

#### Scenario: Chọn loại
- **WHEN** admin bấm Thêm bài tập và chọn "Quiz trắc nghiệm"
- **THEN** drawer soạn quiz mở ra (không tạo gì trước khi submit)

### Requirement: Quiz authoring per lesson
Drawer quiz SHALL tạo quiz qua `POST /courses/lessons/{id}/quizzes`, thêm/xóa câu hỏi qua `POST /courses/quizzes/{quizId}/questions` / `DELETE /courses/questions/{id}` (options editor với correctKeys ràng theo type: SINGLE_CHOICE/TRUE_FALSE đúng 1 key), và publish/unpublish/archive với confirm dialog; lỗi BE (ví dụ xóa câu của quiz đã có attempt) SHALL hiển thị message rõ.

#### Scenario: Soạn và publish quiz
- **WHEN** admin tạo quiz, thêm 3 câu SINGLE_CHOICE hợp lệ rồi Publish (confirm)
- **THEN** quiz chuyển tag PUBLISHED và xuất hiện với learner (hasQuiz trên FE learner)

#### Scenario: correctKeys sai ràng buộc
- **WHEN** admin chọn 2 correctKeys cho câu SINGLE_CHOICE
- **THEN** form chặn client-side trước khi bắn request

### Requirement: Assignment authoring per lesson
Form assignment SHALL tạo qua `POST /courses/lessons/{id}/assignments` với đủ field (title, question, criteria, fileExtension, sortOrder, maxSubmissions, free, testCases tùy chọn) và list refresh sau tạo.

#### Scenario: Tạo assignment
- **WHEN** admin điền đề bài + criteria rồi lưu
- **THEN** assignment xuất hiện trong section với sortOrder đúng

### Requirement: Challenge authoring wizard with single-active guard
Wizard challenge SHALL: (1) tạo challenge với type MULTIPLE_CHOICE/CODE/ESSAY qua `POST /challenges`; (2) nhập nội dung theo type (MCQ questions / test-cases + rubrics / rubrics); (3) gắn lesson qua `PUT /challenges/{id}/lesson` và publish. Khi lesson đã có challenge ACTIVE khác (ràng buộc `uq_challenge_lesson_active` — đã chốt KHÔNG đổi), UI SHALL hiển thị challenge đang chiếm chỗ và hướng dẫn archive trước, KHÔNG retry mù.

#### Scenario: Tạo challenge MCQ trọn vòng
- **WHEN** admin tạo challenge MULTIPLE_CHOICE, nhập 2 câu MCQ, gắn lesson trống challenge, publish
- **THEN** challenge PUBLISHED gắn đúng lessonId và learner thấy entry challenge trên lesson

#### Scenario: Lesson đã có challenge active
- **WHEN** admin gắn challenge mới vào lesson đã có challenge active
- **THEN** UI báo lỗi đích danh challenge đang chiếm chỗ, không ghi đè

#### Scenario: ESSAY ghi chú AI chấm
- **WHEN** admin chọn type ESSAY ở bước 1
- **THEN** bước 2 hiện rubrics editor + ghi chú "chấm bởi AI (ai-service)" — không có UI chọn model

## Seed data

- Không seed ở repo Admin. Môi trường test dùng BE seed `course-demo-seed-dev` (V213):
  lesson `seed-les-c1-s1-l2` (quiz), `seed-les-c1-s1-l3` (assignment), `seed-les-c1-s2-l1`
  (challenge active — dùng test scenario "đã chiếm chỗ"), lesson `seed-les-c1-s2-l2` trống
  để test tạo mới đủ 3 loại.
