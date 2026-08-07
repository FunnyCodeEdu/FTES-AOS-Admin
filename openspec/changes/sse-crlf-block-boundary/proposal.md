## Why

`src/shared/api/sse.test.ts` đỏ 2 test trên máy Windows, xanh trên CI Linux. Không phải test hay
lười, mà là **hai khiếm khuyết thật chồng lên nhau** và chúng che nhau.

**A — Bộ tách block SSE không chịu được CRLF.** `streamSse` cắt event bằng
`buffer.indexOf("\n\n")`. Chuỗi `\r\n\r\n` là `\r \n \r \n` — **không có hai `\n` liền nhau**, nên
`indexOf` trượt sạch: cả stream dồn vào `buffer`, vòng `while` không chạy lần nào, tới cuối rơi vào
nhánh `tail` xử lý TOÀN BỘ payload như MỘT block. `parseSseBlock` khi đó lấy `event:` **cuối cùng**
(`done`) và ghép mọi dòng `data:` lại → 0 delta, 1 `done` với JSON rác.

Đây là mâu thuẫn nội bộ chứ không chỉ là thiếu sót: `parseSseBlock` đã cố ý strip `\r` cuối mỗi dòng
(`sse.ts:47`) và có hẳn test "chịu CRLF (`\r` cuối dòng)" — tức CRLF-awareness là chủ ý. Nhưng vì
bộ tách block không bao giờ sinh ra được block từ stream CRLF, đoạn strip `\r` đó **không bao giờ
chạy được từ đường streaming**. Spec SSE (WHATWG) quy định ranh giới event là một dòng trống, chấp
nhận CRLF; Spring `SseEmitter` ghi `\n\n` nên hiện tại chưa vỡ ngoài đời, nhưng proxy/gateway đứng
giữa đổi sang CRLF là hỏng câm.

**B — Fixture wire-format bị git viết lại xuống dòng.** Repo **không có `.gitattributes`** và máy
dev đặt `core.autocrlf=true`. Blob trong git là LF thuần (kiểm bằng `git cat-file`), nhưng checkout
ra working tree thành CRLF (đo được: `outline-stream.txt` 235 byte / 14 CRLF / 0 LF đơn, so với blob
221 byte / 14 LF). Fixture SSE là **byte trên dây** — mô phỏng đúng thứ `SseEmitter` ghi ra — nên để
git chuẩn hoá nó là làm hỏng chính thứ đang được kiểm thử.

Hệ quả kép: trên Linux fixture là LF nên (A) không lộ; trên Windows fixture thành CRLF nên (A) lộ ra
dưới dạng "test đỏ khó hiểu". Sửa mỗi một trong hai thì test xanh nhưng khiếm khuyết còn lại vẫn nằm
đó — và tệ hơn, hai nền tảng âm thầm kiểm thử hai chuỗi byte khác nhau.

## What Changes

- **Tách block theo dòng trống, không theo `\n\n` cứng.** Hằng `BLOCK_SEPARATOR = /\r?\n\r?\n/` phủ
  `\n\n`, `\r\n\r\n` và cả trộn lẫn. Tập ký tự xuống dòng này khớp ĐÚNG tập mà `parseSseBlock` xử lý
  được (`\n`, có/không `\r` đứng trước) — cố ý không nới rộng hơn sang `\r\r` (CR đơn kiểu Mac cổ),
  vì `parseSseBlock` không tách dòng theo `\r` nên nới một bên sẽ tái lập đúng kiểu lệch đang sửa.
- **`.gitattributes` ghim fixture SSE về `eol=lf`**, kèm `* text=auto` cho phần còn lại. Working tree
  đã khôi phục về LF từ blob.
- **Test chặn tái phát**: dựng biến thể CRLF của fixture NGAY TRONG test (`replace(/\n/g, "\r\n")`)
  thay vì dựa vào fixture thứ hai trên đĩa — như vậy test không phụ thuộc cấu hình git của máy chạy.

## Impact

- Affected specs: `ai-assist-sse-client` (MODIFIED).
- Affected code: `src/shared/api/sse.ts` (bộ tách block), `src/shared/api/sse.test.ts` (+1 test),
  `.gitattributes` (mới), 2 fixture khôi phục về LF.
- Không đổi API, không đổi hành vi với stream LF (đường Spring hiện tại) — chỉ thêm khả năng chịu CRLF.

## Non-goals

- Không hỗ trợ CR đơn (`\r` một mình) làm ranh giới dòng: không server nào dùng, và hỗ trợ nửa vời
  chính là lỗi đang sửa.
- Không đụng parser SSE của FE learner (`FTES Academic Operating System/src/modules/api/rest/ai/ai.ts`)
  dù nó là bản mirror — cần kiểm riêng, ngoài phạm vi repo này.
