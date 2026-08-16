# Tách màn nạp đề FE thành ba chế độ

## Vấn đề

BE đã có BA đường nạp đề vào album FE, mỗi đường cho ra một loại trang khác nhau:

| Đường | Kết quả | Dùng khi |
|---|---|---|
| `POST /images` | trang `IMAGE`, giữ nguyên ảnh | đề scan có hình vẽ tay, ký hiệu lạ |
| `POST /image-text-items` | trang `TEXT`, AI số hoá ảnh | đề chụp màn hình / scan sạch |
| `POST /text-items` | trang `TEXT`, AI dọn hình thức | đã có sẵn .txt/.md |

Admin chỉ gọi được đường thứ nhất. Người soạn không có cách nào chọn đường số hoá — tức là mọi đề
nạp từ Admin đều cho ra trang KHÔNG tìm kiếm được, KHÔNG copy được và bot giải đề KHÔNG đọc được.

Thêm một lỗi độc lập ở phía hiển thị: `FeAlbumPreview` render mọi mục bằng `<Image src={imageUrl}>`.
Trang `TEXT` không có `imageUrl`, nên nó hiện ra một ô ảnh vỡ — không phải lỗi, chỉ là ô trống khó
hiểu với người đang duyệt nội dung.

## Thay đổi

1. Bộ chọn ba chế độ trong `ResourceFormModal`, kèm một dòng nói rõ được gì / mất gì. Mặc định giữ
   nguyên đường cũ (`image`) — đường số hoá KHÔNG lưu lại ảnh gốc, im lặng đổi mặc định là im lặng
   đổi thứ người soạn nhận được ở đầu ra.
2. Hai API mới `uploadFeImageTextItems` / `uploadFeTextItems`, gửi theo LÔ (3 và 10 file), trần lấy
   đúng con số BE chốt.
3. Bộ chạy `runFeAlbumUpload` khái quát để ba chế độ dùng chung nhịp chống rate-limit,
   lùi-thử-lại-khi-429, huỷ giữa chừng và con trỏ nạp-tiếp. Thêm `weightOf` để tiến độ đếm theo
   TRANG chứ không theo bước — 51 trang chia lô 3 phải báo 51, không phải 17.
4. `FeAlbumPreview` rẽ nhánh theo `kind`, chiếu trích đoạn chữ cho trang `TEXT`.

## Quyết định đáng ghi

**Lô hỏng một phần thì coi cả lô là hỏng.** BE trả 200 kèm danh sách `failed` khi vài file trong lô
không nạp được. Nuốt `failed` là báo "đã nạp N trang" cho một con số không đúng, và người soạn chỉ
phát hiện khi ngồi đếm lại album — nên ném lỗi kèm đúng tên file và lý do.
