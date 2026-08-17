# Nạp đề ảnh→chữ: bắn lô rồi theo dõi, không ngồi chờ

## Vấn đề

BE đã chuyển số hoá sang chạy ngầm, nhưng Admin vẫn cư xử như đường cũ: chờ từng lô, giữ nhịp 6,5s
giữa các lô, timeout 300s, và báo "đã tải N ảnh vào album" cho những trang thật ra mới chỉ vào hàng
đợi. Người soạn bị giữ chân ở modal suốt lượt nạp và không mở được bộ đề khác.

## Thay đổi

1. Trần lô ảnh→chữ 3 → **20** (khớp `MAX_IMAGE_FILES_PER_REQUEST` của BE).
2. Bỏ nhịp 6,5s cho hai đường số hoá — nhịp đó chống rate-limit của một lượt upload thật, còn hai
   đường này chỉ ghi trang. BE cũng đã nới trần phút tương ứng.
3. Timeout 300s → **60s**: đường này không còn chờ model, giữ 300s nghĩa là một sự cố mạng thật sẽ
   treo UI 5 phút.
4. Album **tự làm mới mỗi 5s khi còn trang `PENDING`**, dừng khi hết — điều kiện dừng lấy từ dữ
   liệu chứ không từ bộ đếm ở client.
5. Thông báo nói đúng việc đã xảy ra: "đã nhận N trang, đang số hoá ngầm".

## Quyết định đáng ghi

**Điều kiện dừng poll đọc từ `status` của album, không từ số trang client vừa gửi.** Người soạn có
thể đóng modal, mở lại, hoặc nạp thêm lô từ tab khác — mọi cách đếm ở client đều sai trong ít nhất
một tình huống đó.
