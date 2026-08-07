# Tasks — sse-crlf-block-boundary

## 1. Chẩn đoán

- [x] 1.1 Chạy `npx vitest run src/shared/api/sse.test.ts` — 2 test đỏ, `deltas` RỖNG (không phải
      chữ vỡ) ⇒ loại giả thuyết "cắt ngang ký tự UTF-8 multi-byte", hướng về "không tách được block".
- [x] 1.2 Đo byte fixture trong working tree: `outline-stream.txt` 235 byte, 14 CRLF, 0 LF đơn.
- [x] 1.3 Đo byte blob trong git (`git cat-file`/`git show`): LF thuần ⇒ git checkout là thủ phạm,
      không phải người viết fixture.
- [x] 1.4 Xác nhận `core.autocrlf=true` và repo KHÔNG có `.gitattributes`.
- [x] 1.5 `git log -S` trên `sse.ts`: chỉ 1 commit (`11c8d18` rush) — không có quyết định sản phẩm
      nào bị lật, docblock test không stale.

## 2. Vá code

- [x] 2.1 Thêm hằng `BLOCK_SEPARATOR = /\r?\n\r?\n/` kèm docblock nêu rõ vì sao `indexOf("\n\n")`
      trượt trên CRLF, và ràng buộc "đừng nới rộng hơn tập mà `parseSseBlock` xử lý được".
- [x] 2.2 Đổi vòng tách block sang `BLOCK_SEPARATOR.exec(buffer)`, dùng `sep.index` +
      `sep[0].length` (độ dài ranh giới thay đổi 2↔4 nên KHÔNG hardcode `+2`).

## 3. Chặn nguyên nhân gốc

- [x] 3.1 Thêm `.gitattributes`: `* text=auto` + ghim `__fixtures__/sse/*.txt` thành `text eol=lf`.
- [x] 3.2 Khôi phục 2 fixture trong working tree về LF từ blob; đo lại: 0 CRLF, 14 và 8 LF.

## 4. Test

- [x] 4.1 Thêm test CRLF dựng biến thể ngay trong test (`replace(/\n/g, "\r\n")`), không thêm fixture
      thứ hai trên đĩa (tránh phụ thuộc cấu hình git của máy chạy).
- [x] 4.2 Mutation check: hoàn nguyên `indexOf("\n\n")` ⇒ ĐÚNG test mới đỏ, 15 test kia vẫn xanh;
      khôi phục bản vá ⇒ 16/16 xanh.

## 5. Nghiệm thu

- [x] 5.1 `npm test` xanh toàn bộ.
- [x] 5.2 `npm run build` xanh (`tsc -b` + vite build).
- [ ] 5.3 Kiểm parser mirror bên FE learner
      (`FTES Academic Operating System/src/modules/api/rest/ai/ai.ts`) xem có cùng lỗi tách block
      không — NGOÀI phạm vi repo này, cần change riêng.
