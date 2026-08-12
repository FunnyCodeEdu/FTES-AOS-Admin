# admin-challenge-paper-zip-folder — đề thi nhận .zip và nhận cả THƯ MỤC

## Why

Đề thi đính vào thử thách (`ChallengePaperModal`) hiện chỉ nhận **một** tệp ảnh hoặc PDF, trần
chung 25 MB. Đề thật của môn hiếm khi là một tệp: đề PE là một thư mục starter code + dữ liệu mẫu +
bản mô tả, đề FE là một xấp ảnh scan. Admin đang phải tự nén ở máy rồi… không nạp được, vì `.zip`
bị chặn ngay ở client.

BE đang mở rộng song song để nhận `application/zip`, với **trần theo từng loại** thay vì một trần
chung (ảnh 25 MB · PDF 50 MB · ZIP 100 MB). Phần Admin phải đi cùng: nhận `.zip`, và nhận luôn
**cả thư mục** — trình duyệt nén tại chỗ thành một `.zip` để admin không phải rời màn hình.

Trần theo loại còn là lý do phải soi gương ràng buộc ở client: đẩy 90 MB lên rồi mới ăn 400 là vài
phút chờ cho một câu trả lời biết trước, và trên mạng kém nó hiện ra dưới dạng "Kết nối thất bại"
— sai nguyên nhân, admin đi sửa nhầm chỗ.

Tầng quyền không đổi: nút đính đề vẫn nằm sau `disabled` do trang truyền xuống theo permission của
BE (`docs/ADMIN-ARCHITECTURE.md`), change này không thêm/bớt permission leaf nào.

## What Changes

- `paperFile.ts`: phân loại tệp đề thành ba **kind** (`image` / `pdf` / `zip`) với **trần riêng**
  từng kind; nhận `.zip` theo MIME (`application/zip`, `application/x-zip-compressed`) HOẶC theo
  ĐUÔI khi trình duyệt trả MIME rỗng/chung chung (`application/octet-stream`); thông báo từ chối
  nêu đúng tên loại và trần của loại đó.
- Kiểm **magic bytes** (`PK\x03\x04`…) cho `.zip` mà trình duyệt khai MIME chung — BE cũng soi
  magic bytes, nên tệp `.rar` đổi đuôi phải chết ở máy admin chứ không phải sau 100 MB đường truyền.
- `ChallengePaperModal`: hai đường nạp đề — **chọn tệp** (ảnh/PDF/ZIP) và **chọn cả thư mục**
  (nén thành `.zip` ngay trong trình duyệt bằng `jszip`, giữ nguyên đường dẫn tương đối).
- Thư mục: bỏ tệp rác (`.DS_Store`, `Thumbs.db`, `desktop.ini`, `__MACOSX/`) và tệp 0 byte, **báo
  rõ đã bỏ bao nhiêu và vì sao**; hiện tiến độ nén; hiện **cỡ archive TRƯỚC khi tải lên**; chặn
  ngay nếu archive vượt trần ZIP.
- Lỗi từ chối của server hiện **nguyên văn** (chỉ cắt tiền tố mã lỗi): trần là hợp đồng của server,
  không phải con số đóng cứng trong FE — bảng `ADMIN_ERROR_MESSAGES` bỏ hai câu dịch đóng cứng
  "chỉ nhận PDF/PNG/JPEG/WebP" và "vượt 25 MB" vốn sẽ nói sai ngay khi BE lên.
- Copy nói rõ ZIP **không** được đóng watermark (archive thì đóng vào đâu) — chỉ ảnh/PDF được.

## Capabilities

### New Capabilities

- `admin-challenge-paper-zip-folder`: nạp đề thi dạng `.zip` hoặc dạng thư mục (nén ở client),
  với trần theo từng loại tệp và báo cáo minh bạch về tệp bị bỏ + cỡ archive.

### Modified Capabilities

- Không sửa capability đã archive nào. Change `admin-challenge-bank-console` (chưa archive) mô tả
  requirement "Attach an exam paper file to a challenge" theo phạm vi PDF/ảnh — change này MỞ RỘNG
  phạm vi đó; khi archive, requirement mới thay phần định dạng/trần của requirement cũ.

## Impact

- Feature folder: `src/features/academic/challenge-bank/` — `paperFile.ts` (+ test),
  `paperFolderZip.ts` (mới), `components/ChallengePaperModal.tsx`,
  `api/challengeBankConsole.api.ts` (timeout upload).
- Shared: `src/shared/api/errors.ts` — bỏ 2 câu dịch đóng cứng của lỗi đề thi.
- API BE tiêu thụ: `POST /api/v1/admin/challenges/{id}/paper` (multipart `file`) — **hình dạng
  response KHÔNG đổi**; chỉ tập MIME nhận và trần là mở rộng. Xem mục ASSUMPTION trong `design.md`.
- Không route mới, không permission leaf mới, không màn hình mới.
- Dependency: `jszip@3.10.1` đã có sẵn trong `package.json` (còn lại từ luồng FE-album cũ đã gỡ) —
  change này dùng lại, KHÔNG thêm dependency.
