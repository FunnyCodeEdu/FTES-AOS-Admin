# Design — admin-challenge-paper-zip-folder

## 1. Route & màn hình

Không có route mới. Toàn bộ thay đổi nằm trong **một modal đã tồn tại**:

| Nơi mở | Route | Component |
| --- | --- | --- |
| Kho thử thách → cột thao tác → "Đề thi" | `/academic/challenge-bank` | `ChallengePaperModal` |
| Hàng đợi duyệt → "Đề thi" | `/academic/challenge-review` | `ChallengePaperModal` |

Bố cục modal sau thay đổi (từ trên xuống):

1. Tên thử thách.
2. Khối **đề hiện có** (`Descriptions`: tên tệp / định dạng + cỡ / link mở) hoặc `Alert` "chưa có đề".
3. Vùng lỗi: lỗi cục bộ (validate ở máy) và lỗi upload (server).
4. **Hai đường nạp đề**, đặt cạnh nhau, mỗi đường một nhãn nói rõ dùng khi nào:
   - `Đề dạng ảnh/PDF hoặc .zip có sẵn` → nút "Chọn tệp đề" (AntD `Upload`, `beforeUpload` trả
     `false`/`LIST_IGNORE`).
   - `Bộ đề dạng thư mục / nhiều tệp → sẽ nén thành .zip` → nút "Chọn cả thư mục"
     (`<input type="file">` ẩn, bật `webkitdirectory`).
5. Khối **trạng thái lựa chọn**: đang nén (Progress) / đã chọn (tên + cỡ) / báo cáo tệp bị bỏ.
6. Nút "Tải lên" + "Gỡ đề".
7. Dòng chú thích trần theo loại + ghi chú watermark.

## 2. Permission gates

- Không thêm permission leaf. Modal nhận `disabled` từ trang cha (`!canManage`), tính từ
  permission BE trả về — giữ nguyên. Khi `disabled`, toàn bộ khối 4–6 không render (đọc-xem-tải
  vẫn được).
- CTV scoped: trang cha đã lọc dòng kho theo scope; modal không tự suy diễn lại.
- Xoá đề vẫn qua `Modal.confirm` (mutation nguy hiểm — luật `CLAUDE.md`), không đổi.

## 3. API contract tiêu thụ

| Method | Path | Quyền | Request | Response `data` |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/admin/challenges/{id}/paper` | như hiện tại | multipart, field `file` | `{paperUrl, paperMime, paperFilename, paperSizeBytes}` |
| DELETE | `/api/v1/admin/challenges/{id}/paper` | như hiện tại | — | `null` |

Envelope `{code, message, data|null}` — không đổi.

### ASSUMPTION (BE đang mở rộng SONG SONG, chưa deploy lúc viết change này)

| # | Giả định | Nếu sai thì sao |
| --- | --- | --- |
| A1 | Hình dạng response **không đổi** khi tệp là zip (`paperMime = "application/zip"`). | `ChallengePaperInfo` hiển thị `—` ở ô định dạng; không vỡ. |
| A2 | MIME nhận thêm: `application/zip`, `application/x-zip-compressed`. | Server trả 400, FE hiện **nguyên văn** message của server. |
| A3 | `.zip` gửi dưới `application/octet-stream` được nhận **chỉ khi** magic bytes là zip thật. FE vì thế phải gửi zip thật (folder → JSZip đảm bảo điều đó) và tự soi 4 byte đầu với tệp người dùng chọn. | Nếu BE thực ra từ chối thẳng `application/octet-stream`: tệp `.zip` mà Windows không map MIME sẽ ăn 400 với message của server. Cách chữa khi đó: FE tự đặt lại `type` khi dựng `File` gửi đi (đã làm cho nhánh thư mục, có thể mở rộng cho nhánh chọn tệp trong 1 dòng). |
| A4 | Trần theo loại: ảnh 25 MB · PDF 50 MB · ZIP 100 MB, tính theo **mebibyte** (`n * 1024 * 1024`) như trần 25 MB hiện hành. | Trần client chặt hơn ⇒ chặn oan tệp hợp lệ (phải nới hằng số); trần client lỏng hơn ⇒ server từ chối và FE hiện **message của server nguyên văn** (đó là lý do bỏ hai câu dịch đóng cứng ở `errors.ts`). |
| A5 | ZIP **không** được đóng watermark; ảnh/PDF vẫn được. | Chỉ ảnh hưởng câu chữ trong modal. |
| A6 | Mã lỗi `CHALLENGE_PAPER_INVALID_TYPE` / `CHALLENGE_PAPER_TOO_LARGE` (nếu BE giữ) đi kèm message người-đọc-được, có thể mang tiền tố `MÃ: chi tiết`. | FE cắt tiền tố mã rồi hiện phần còn lại; nếu message rỗng thì hiện câu mặc định. |

**Trần là hợp đồng của SERVER.** Client soi gương để chặn sớm, nhưng khi hai bên lệch thì **server
thắng** và message của server được hiện nguyên văn — không dịch, không thay bằng con số đóng cứng
trong FE.

## 4. State & data

Không thêm query key. Mutation dùng lại `useUploadChallengePaper` / `useDeleteChallengePaper`
(invalidate `challengeBankConsoleKeys.all` + `challengeBankKeys.all` + `exerciseKeys.all` như cũ).

`timeout` của upload nâng **180s → 600s**: 100 MB trên đường lên 3 Mbps là ~4,5 phút, timeout cũ
sẽ cắt giữa chừng và hiện ra như lỗi mạng.

State cục bộ của modal:

| State | Kiểu | Vai trò |
| --- | --- | --- |
| `selected` | `{ file: File; source: "file" \| "folder"; note?: string } \| null` | Tệp sẽ gửi. Nhánh thư mục cũng quy về một `File` (`new File([blob], name, {type:"application/zip"})`) để đường gửi CHỈ có một. |
| `zipping` | `{ percent: number; total: number } \| null` | Đang nén — khoá mọi nút. |
| `folderReport` | `string[]` | Câu cảnh báo tệp bị bỏ (không bao giờ bỏ im lặng). |
| `localError` | `string \| null` | Lý do từ chối ở máy. |
| `justUploaded`, `removed` | như cũ | Nguồn hiển thị khi dòng kho chưa mang field `paper*`. |

`zipRunRef` (số tăng dần): mỗi lần chọn thư mục tăng 1; kết quả `generateAsync` về mà `zipRunRef`
đã đổi (admin chọn lại / đóng modal) thì **bỏ**, không set state — JSZip không huỷ được giữa chừng.

## 5. Luồng nghiệp vụ chính

### 5.1 Chọn một tệp (ảnh / PDF / ZIP)

1. `beforeUpload(file)` → `validatePaperFile(file)`.
2. Sai loại / rỗng / vượt trần **của loại đó** → `localError` + `Upload.LIST_IGNORE`, không set
   `selected`.
3. Là `.zip` mà MIME rỗng hoặc `application/octet-stream` → đọc **4 byte đầu**
   (`file.slice(0,4).arrayBuffer()`), `looksLikeZip()` sai → từ chối tại chỗ ("không phải tệp zip
   thật"). Đọc bất thành (quyền/đĩa) → **cho qua**, để server phán (không chặn oan).
4. Hợp lệ → `selected = { file, source: "file" }`, hiện tên + cỡ.
5. "Tải lên" → mutation → thành công: hiện đề mới, `onChanged()`.

### 5.2 Chọn cả thư mục → nén → tải lên

1. Nút "Chọn cả thư mục" click input ẩn đã bật `webkitdirectory`/`directory` (đặt bằng **callback
   ref**, không phải prop JSX — React không có prop này; cùng cách `ResourceFormModal` đang dùng).
2. `planPaperFolderZip(files)` (thuần):
   - bỏ **rác**: `.DS_Store`, `Thumbs.db`, `desktop.ini`, mọi thứ trong `__MACOSX/`;
   - bỏ **0 byte**;
   - giữ `webkitRelativePath` làm đường dẫn trong archive ⇒ cấu trúc thư mục sống sót;
   - trả `items`, `picked`, `skipped[]` (gom theo lý do + vài tên ví dụ), `rawBytes`, `rootName`.
3. Chặn trước khi nén:
   - `items` rỗng → "Thư mục không có tệp nào để nén" (kèm báo cáo tệp bị bỏ nếu có).
   - `rawBytes > 500 MB` (`PAPER_FOLDER_MAX_RAW_BYTES`, **guard của client**, không phải hợp đồng
     BE) → từ chối kèm con số: nén 500 MB trong tab trình duyệt là treo máy nhiều phút để gần như
     chắc chắn vẫn vượt trần 100 MB.
4. Nén: `zipPaperFolder(items, onProgress)` → `JSZip.generateAsync({type:"blob", compression:
   "DEFLATE", compressionOptions:{level:6}}, meta => onProgress(meta.percent))`. UI hiện
   `Progress` + "Đang nén N tệp…".
5. Xong: dựng `File([blob], "<tên-thư-mục>.zip", {type:"application/zip"})` → chạy
   `validatePaperFile` lên **archive kết quả** → vượt 100 MB thì từ chối, câu từ chối **nêu cỡ
   archive** và trần.
6. Hợp lệ → `selected = { file, source: "folder" }`, hiện: tên archive, **cỡ archive**, số tệp đã
   nén, và các dòng "đã bỏ N tệp …". Admin thấy mình sắp gửi 82 MB *trước khi* bấm gửi.
7. "Tải lên" → cùng một mutation như 5.1.

### 5.3 Server từ chối

- `404/405` → giữ nguyên câu "endpoint chưa deploy".
- Còn lại → hiện `adminErrorMessage(error)` đã cắt tiền tố mã (`paperServerMessage`), **nguyên văn**
  message của server. Không thay bằng con số trần của FE (nếu không, BE nới trần lên 200 MB là FE
  nói dối).

### 5.4 Gỡ đề

Không đổi: `Modal.confirm` → `DELETE` → `onChanged()`.

## 6. UX states

| Trạng thái | Hiển thị |
| --- | --- |
| Chưa có đề | `Alert` info "Thử thách này chưa có tệp đề." |
| Đang nén | `Progress` phần trăm + "Đang nén N tệp thành .zip…"; mọi nút `disabled` |
| Đã chọn (tệp) | "Đã chọn: `<tên>` (`<cỡ>`)" |
| Đã chọn (thư mục) | "Đã nén `<n>` tệp → `<tên>.zip` (`<cỡ archive>`)" + dòng cảnh báo tệp bị bỏ |
| Từ chối ở máy | `Alert` error, câu nói **rõ loại + trần của loại đó** |
| Đang tải lên | nút "Tải lên" `loading` |
| Server từ chối | `Alert` error, message **của server** |
| Không có quyền (`disabled`) | Chỉ khối xem/tải đề; không nút nào |

## 7. Ranh giới có chủ ý

- **Không** giải nén/duyệt nội dung zip ở client (không phải việc của Admin; BE mới là nơi soi).
- **Không** huỷ được giữa chừng khi đang nén (JSZip `generateAsync` không có abort) — thay vào đó
  chặn trước bằng `PAPER_FOLDER_MAX_RAW_BYTES` và bỏ kết quả cũ bằng `zipRunRef`.
- **Không** đóng watermark ở client cho bất kỳ loại nào; ảnh/PDF do server đóng, zip không đóng.
- **Không** đổi hợp đồng props của `ChallengePaperModal` ⇒ hai trang gọi nó không phải sửa.
