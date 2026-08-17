# Nút đưa học liệu ra mắt trong màn Học liệu

## Vấn đề

Vòng đời của BE là `DRAFT → PENDING_APPROVAL → APPROVED`, và **chỉ `APPROVED` mới hiện ra cho học
viên và cho trang môn** (`ResourceService` lọc đúng trạng thái đó).

Admin có đường duyệt cho học liệu ĐÃ nằm trong hàng chờ (màn Duyệt học liệu), nhưng màn Học liệu —
nơi người soạn vừa nạp xong một bộ đề — không có nút nào đẩy nó đi tiếp. Kết quả: bộ đề nạp xong
đứng mãi ở `DRAFT`, không xuất hiện trên môn, và không có gì trên màn hình nói vì sao.

## Thay đổi

Một nút **"Đưa ra mắt"** trên mỗi dòng chưa `APPROVED`, gộp `submit` + `approve`.

## Quyết định đáng ghi

**Gộp hai bước làm một hành động.** Người soạn có quyền duyệt thì bắt bấm hai nút liên tiếp không
thêm quyết định nào, chỉ thêm một chỗ để bỏ dở giữa chừng.

**`submit` được bọc try/catch chứ không bỏ qua kết quả.** Học liệu đang ở `PENDING_APPROVAL` sẽ bị
BE từ chối bước này (sai trạng thái nguồn) — đó là lỗi vô hại, bước sau mới quyết định. Ném nó lên
sẽ báo "không đưa ra mắt được" cho một học liệu chỉ việc duyệt là xong.

**So sánh trạng thái không phân biệt hoa/thường.** `adminResources` (GraphQL) trả status THÔ
(`DRAFT`/`APPROVED`), REST detail trả nhãn đã map (`approved`). Cùng một cột nhận hai dạng; so
thẳng với chuỗi thường sẽ hiện nút trên chính học liệu đã ra mắt.

**Có xác nhận trước khi bấm.** Từ lúc duyệt, học viên thấy được nội dung — một bộ đề lỡ công khai
không thu lại được bằng cách bấm nút.
