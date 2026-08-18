# admin-challenge-bank-console

## ADDED Requirements

### Requirement: Gắn thử thách có sẵn từ kho vào bài học đang mở
Màn hình bài tập của một bài học SHALL cho người quản thử thách chọn một thử thách ĐÃ CÓ trong kho
chung rồi thêm vào bài học đó, tách bạch với đường soạn thử thách mới.

Danh sách chọn SHALL tìm trên kho chung — SHALL KHÔNG giới hạn theo môn hay khoá của bài học đang
mở, và SHALL KHÔNG lọc bỏ những thử thách đã gắn ở bài học khác.

Danh sách SHALL cho tìm theo tiêu đề và lọc theo tag.

#### Scenario: Dùng lại thử thách của môn khác
- **WHEN** người quản mở màn chọn từ kho tại một bài học của môn B
- **THEN** thử thách đang dùng ở một bài học của môn A SHALL xuất hiện trong danh sách
- **AND** người quản SHALL thêm được nó vào bài học đang mở

#### Scenario: Lọc theo tag
- **WHEN** người quản chọn một hoặc nhiều tag
- **THEN** danh sách SHALL chỉ còn thử thách mang đủ các tag đó

### Requirement: Thêm từ kho không được gỡ thử thách khỏi bài học khác
Thao tác thêm từ kho SHALL thêm một chỗ dùng mới cho thử thách và SHALL giữ nguyên mọi chỗ dùng
đang có của nó.

Thử thách đã nằm trong chính bài học đang mở SHALL hiện trạng thái đã-có thay vì nút thêm.

#### Scenario: Bài đang dùng ở bài học khác
- **WHEN** người quản thêm vào bài học đang mở một thử thách đang dùng ở bài học khác
- **THEN** thử thách SHALL có mặt ở cả hai bài học

#### Scenario: Bài đã có trong bài học đang mở
- **WHEN** một thử thách trong danh sách đã nằm trong bài học đang mở
- **THEN** màn hình SHALL hiện trạng thái đã-có cho dòng đó
- **AND** SHALL KHÔNG hiện nút thêm cho dòng đó
