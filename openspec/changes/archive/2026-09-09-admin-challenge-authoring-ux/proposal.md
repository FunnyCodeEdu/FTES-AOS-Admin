# admin-challenge-authoring-ux — phân biệt Project/Sandbox và sửa đủ đề AI

## Why

Màn sinh challenge bằng AI đang hiện enum `CODE`/`CODING` nhưng không nói hai loại dẫn tới bề mặt
học viên và cơ chế chấm hoàn toàn khác nhau. Sau khi AI trả draft, mentor cũng không có chỗ sửa cách
nộp theo từng bài. Kết quả là một bài mong muốn nộp project GitHub/thư mục có thể thành code editor
test-case, hoặc ngược lại.

Màn Sửa còn dựng form từ read-model danh sách bị rút gọn. Các project HSF/PRN thực tế chỉ có summary
ngắn trong `description`, còn toàn bộ đề và rubric nằm trong `gradingConfig.question/criteria`, nên
mentor nhìn thấy đề thiếu và không thể sửa đúng nội dung AI dùng để chấm.

## What Changes

- Đổi nhãn loại AI sang tiếng Việt theo trải nghiệm nộp/chấm: Project GitHub/ZIP + AI chấm; Code/SQL
  Sandbox + test case.
- Sau khi AI sinh draft, cho chọn riêng từng bài là Sandbox hay Project; Project chọn GITHUB, FILE
  hoặc BOTH và whitelist đuôi tệp. Builder tạo payload canonical, không trộn test case với AI grading;
  Sandbox rỗng test case bị chặn ngay tại bản nháp.
- Màn Sửa gọi endpoint detail tác giả, chờ dữ liệu đầy đủ rồi mới hydrate/cho lưu, và không để cache
  refetch ghi đè phần mentor đang gõ.
- Project CODE và ESSAY hiện/sửa `question` + `criteria` đầy đủ qua flat PATCH. Giữ nguyên các key ẩn
  trong grading config.
- Project ẩn tool sandbox; sandbox không bị ép có rubric. Chỉ khi chủ động đổi sandbox sang Project
  mới bắt nhập đề/rubric và nhận cảnh báo đổi grading route. Project cũ vốn đủ nội dung không thể bị
  xoá trắng; record legacy vốn thiếu vẫn sửa metadata được.

## Capabilities

### New Capabilities

- `admin-challenge-authoring`: tạo/sửa challenge theo workflow Project/Sandbox rõ ràng và round-trip
  đầy đủ nội dung AI chấm.

## Impact

- `src/features/academic/ai-assist/components/ChallengeGenerateModal.tsx`
- `src/features/academic/exercises/components/ChallengeEditModal.tsx`
- API key/hook + DTO challenge trong `src/features/academic/exercises/`
- Phụ thuộc Backend `GET/PATCH /api/v1/admin/challenges/{id}` lộ/nhận flat `question`, `criteria` và
  giữ nguyên các key grading khác khi merge.
- Không thêm route, permission leaf hay dependency.

## Non-goals

- Không thay editor câu hỏi trắc nghiệm.
- Không thay runner/test-case engine hay dịch vụ AI chấm.
- Không tự chuyển dữ liệu challenge cũ trong database.
