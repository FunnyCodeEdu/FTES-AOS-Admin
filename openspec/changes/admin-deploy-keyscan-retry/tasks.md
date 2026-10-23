# Tasks — admin-deploy-keyscan-retry

## 1. Vòng thử lại cho ssh-keyscan
- [x] 1.1 Đưa `PORT`/`HOST` ra biến shell trong bước `Setup SSH`
- [x] 1.2 Vòng `for attempt in 1 2 3`, nghỉ 5s giữa các lần (không nghỉ sau lần cuối)
- [x] 1.3 `ssh-keyscan` gọi với `-T 15` để mỗi lần có trần thời gian
- [x] 1.4 Mã lỗi của từng lần không được giết step (`|| echo …`, tránh `bash -e`)

## 2. Log đọc được và kiểm chứng kết quả
- [x] 2.1 Bỏ `2>/dev/null` — stderr `ssh-keyscan` vào thẳng log
- [x] 2.2 In số thứ tự mỗi lần thử; không in giá trị secret ra log (không echo `$HOST`)
- [x] 2.3 Sau vòng lặp: kiểm `~/.ssh/known_hosts` thật sự có dòng host key
- [x] 2.4 Cả 3 lần trượt (hoặc `known_hosts` rỗng) → `::error::` + `exit 1`
- [x] 2.5 Thành công → in số dòng host key thu được

## 3. Không đổi gì khác
- [x] 3.1 Bước `Đẩy dist vào staging rồi deploy qua root wrapper` giữ nguyên từng ký tự
      (đối chiếu sau khi sửa: vẫn `sudo /usr/local/sbin/ftes-admin-deploy.sh`)
- [x] 3.2 Bước `Public smoke test`, trigger, `concurrency`, `timeout-minutes` giữ nguyên
      (`git diff` chỉ chạm đúng bước `Setup SSH`: +21 −1)

## 4. Verify
- [x] 4.1 `npx openspec validate admin-deploy-keyscan-retry --strict` xanh
- [x] 4.2 Workflow parse được bằng YAML loader; 7 step giữ nguyên thứ tự và tên
- [x] 4.3 Chạy khô đoạn shell của bước `Setup SSH` dưới đúng `bash -e` (như GitHub chạy),
      render từ chính file workflow, HOME cô lập:
  - host không tồn tại → thử đủ 3 lần, có nghỉ 5s (11s), stderr `getaddrinfo …` hiện trong log,
    `::error::`, exit 1
  - host thật (`github.com`) → đúng 1 lần, không nghỉ, 3 dòng host key (đã băm `-H`), exit 0
  - shim `ssh-keyscan` exit 0 nhưng không in gì → vẫn thử 3 lần rồi exit 1 (kiểm nội dung ăn tiền,
    không tin mã lỗi)
  - shim exit 1 nhưng CÓ in key → nhận ngay ở lần 1, exit 0
