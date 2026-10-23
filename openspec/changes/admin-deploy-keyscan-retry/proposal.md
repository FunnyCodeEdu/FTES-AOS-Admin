# admin-deploy-keyscan-retry — một cú chập mạng của `ssh-keyscan` không được giết cả lần deploy

## Why

Bước `Setup SSH` của `.github/workflows/deploy-production.yml` lấy host key của box prod bằng:

```
ssh-keyscan -p "…" -H "…" >> ~/.ssh/known_hosts 2>/dev/null
```

Một dòng đó mang hai khuyết điểm cộng hưởng nhau, và đã làm **hỏng một lần deploy thật**
(run `32988534729`, 2026-08-26 16:28, `Process completed with exit code 1`):

- **Không có vòng thử lại.** GitHub chạy step với `shell: /usr/bin/bash -e {0}` — hễ `ssh-keyscan`
  trả mã khác 0 là cả job chết **ngay trước bước rsync**. `ssh-keyscan` nói chuyện với mạng và DNS,
  hai thứ vốn chập chờn trên runner: một cú trượt nhất thời đủ chặn đứng lần lên bản.
- **`2>/dev/null` nuốt luôn lý do.** Đúng dòng stderr giải thích vì sao (không phân giải được tên,
  connection refused, timeout) bị vứt đi. Log của run hỏng chỉ còn `exit code 1`, không có gì để đọc,
  nên không ai biết đó là chập mạng hay secret sai host.

Hệ quả thực tế: bản đã merge vào `production` không tự lên, phải chạy tay lại bằng
`workflow_dispatch` mới deploy được.

Thêm một lỗ nữa cùng chỗ: `ssh-keyscan` có thể **trả mã 0 mà không in ra host key nào**. Khi đó
`known_hosts` rỗng, step vẫn xanh, và lần hỏng bị đẩy xuống bước rsync dưới dạng lỗi
host-key khó đọc hơn nhiều.

## What Changes

Chỉ sửa bước `Setup SSH` trong `.github/workflows/deploy-production.yml`:

- **Vòng thử lại 3 lần, nghỉ 5s giữa các lần.** Chỉ fail khi cả 3 lần đều không lấy được host key.
  Mỗi lần in ra số thứ tự để log đọc được.
- **Bỏ `2>/dev/null`** — stderr của `ssh-keyscan` chảy thẳng vào log của step.
- **Thêm `-T 15`** cho mỗi lần gọi: có vòng lặp thì phải chặn trần thời gian từng lần, tránh một
  lần treo ăn hết `timeout-minutes: 25` của job.
- **Kiểm `known_hosts` thật sự có nội dung** sau khi keyscan xong; rỗng thì `::error::` + `exit 1`
  ngay tại đây, thay vì để bước rsync chết mờ mịt.

## Capabilities

### New Capabilities

- `admin-deploy-keyscan-retry`: bước lấy host key của deploy production chịu được lỗi mạng nhất
  thời, và khi thật sự hỏng thì log nói được vì sao.

### Modified Capabilities

Không sửa capability nào khác.

## Impact

CI-only. Sửa đúng một bước trong `.github/workflows/deploy-production.yml`. **Không** đổi đường
deploy: vẫn rsync `dist/` vào `~/admin-staging` rồi gọi wrapper root
`sudo /usr/local/sbin/ftes-admin-deploy.sh`. Không đổi secret, không đổi bước build, không đổi
smoke test. Không đụng source của app → `npm run build` không bị ảnh hưởng.
