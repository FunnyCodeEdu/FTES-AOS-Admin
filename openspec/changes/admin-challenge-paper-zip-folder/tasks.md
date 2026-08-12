# Tasks — admin-challenge-paper-zip-folder

## 1. Validate tệp đề theo LOẠI (`src/features/academic/challenge-bank/paperFile.ts`)

- [x] 1.1 Thêm `PaperKind = "image" | "pdf" | "zip"` + bảng trần riêng
      (`PAPER_IMAGE_MAX_BYTES` 25 MB · `PAPER_PDF_MAX_BYTES` 50 MB · `PAPER_ZIP_MAX_BYTES` 100 MB)
      và bảng nhãn tiếng Việt cho từng loại.
- [x] 1.2 `paperKindOf(file)`: nhận zip theo MIME (`application/zip`,
      `application/x-zip-compressed`) HOẶC theo đuôi `.zip` khi MIME rỗng / chung chung
      (`application/octet-stream`, `application/binary`).
- [x] 1.3 `validatePaperFile` dùng trần của ĐÚNG loại; message từ chối nêu tên loại + cỡ tệp + trần
      của loại đó. Bỏ `PAPER_MAX_BYTES` (trần chung) — không còn nghĩa.
- [x] 1.4 `looksLikeZip(bytes)` — soi 4 byte đầu (`PK\x03\x04` / `PK\x05\x06` / `PK\x07\x08`);
      `paperServerMessage(msg)` — cắt tiền tố `MÃ_LỖI:` để hiện nguyên văn phần người đọc được.
- [x] 1.5 `planPaperFolderZip(files)` (THUẦN): bỏ rác (`.DS_Store`, `Thumbs.db`, `desktop.ini`,
      `__MACOSX/`) + tệp 0 byte, giữ `webkitRelativePath`, gom `skipped` theo lý do + ví dụ, trả
      `rawBytes`/`rootName`; `describeFolderSkips(plan)` ra câu tiếng Việt; `folderArchiveName()`.
- [x] 1.6 Mở rộng `paperFile.test.ts` cho tất cả mục trên (trần từng loại, fallback đuôi, magic
      bytes, kế hoạch thư mục, cắt tiền tố mã lỗi).

## 2. Nén thư mục ở trình duyệt (`paperFolderZip.ts` — mới)

- [x] 2.1 `zipPaperFolder(items, onProgress)` bằng `jszip` (đã có sẵn trong `package.json`, còn lại
      từ luồng FE-album đã gỡ — KHÔNG thêm dependency); DEFLATE mức 6, callback `metadata.percent`.
      Hình dạng hàm khôi phục từ `zipFolder` cũ trong lịch sử git (`de21758^` —
      `src/features/academic/resources/components/ResourceFormModal.tsx`).
- [x] 2.2 `PAPER_FOLDER_MAX_RAW_BYTES` (500 MB) — guard của CLIENT, chặn trước khi nén.

## 3. Modal đề thi (`components/ChallengePaperModal.tsx`)

- [x] 3.1 Hai đường nạp đề đặt cạnh nhau, nhãn nói rõ: "Đề dạng ảnh/PDF hoặc .zip có sẵn" vs
      "Bộ đề dạng thư mục / nhiều tệp → sẽ nén thành .zip".
- [x] 3.2 Input thư mục: `webkitdirectory`/`directory` đặt bằng **callback ref** (không phải prop
      JSX), nút bấm gọi `.click()`.
- [x] 3.3 Nén có `Progress`; xong thì hiện tên archive + **cỡ archive** + số tệp + báo cáo tệp bỏ;
      `zipRunRef` bỏ kết quả cũ khi admin chọn lại / đóng modal.
- [x] 3.4 Ép trần ZIP lên **archive kết quả**, câu từ chối nêu cỡ archive.
- [x] 3.5 Soi magic bytes cho `.zip` chọn tay khi MIME rỗng/chung; đọc lỗi thì cho qua (để server phán).
- [x] 3.6 Chú thích trần từng loại + ZIP KHÔNG watermark.
- [x] 3.7 Lỗi server hiện nguyên văn qua `paperServerMessage`.

## 4. Hợp đồng phía server

- [x] 4.1 `useUploadChallengePaper`: timeout 180s → 600s (100 MB trên đường lên chậm).
- [x] 4.2 `src/shared/api/errors.ts`: bỏ 2 câu dịch đóng cứng `CHALLENGE_PAPER_INVALID_TYPE` /
      `CHALLENGE_PAPER_TOO_LARGE` (đóng cứng "PDF/PNG/JPEG/WebP" và "25 MB" ⇒ nói SAI ngay khi BE
      lên); để message của server đi thẳng ra UI.

## 5. Verify

- [x] 5.1 `openspec validate admin-challenge-paper-zip-folder --strict` sạch.
- [x] 5.2 `npx tsc --noEmit` sạch.
- [x] 5.3 `npm run build` xanh.
- [x] 5.4 `npx vitest run` xanh.
