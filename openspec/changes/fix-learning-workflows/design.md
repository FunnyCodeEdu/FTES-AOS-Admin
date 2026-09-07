# Design — fix-learning-workflows

Pricing tab tải danh sách challenge của khóa bằng API admin hiện có. Modal entitlement cho phép chọn challenge được cấp và challenge mở miễn phí; payload giữ đúng các trường `selectedExerciseIds`/`freeExerciseIds`. Form sửa challenge gửi partial `maxSubmissions` khi thay đổi. UI tiếp tục permission-driven theo trạng thái read-only của trang.
