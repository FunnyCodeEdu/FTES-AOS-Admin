## Why

Đăng nhập trang admin phải bấm HAI LẦN (mở tab chọn tài khoản Google hai lượt) mới vào được.

Nguyên nhân: `useFinishSession` gọi `setTokens(...)` rồi `refetch()` của `useMe` NGAY trong cùng tick.
`useMe` bị gác `enabled: accessToken !== null`; tại thời điểm đó observer VẪN đang disabled (store vừa
set, component chưa re-render) mà React Query v5 tôn trọng `enabled` cả khi refetch thủ công → refetch
là NO-OP → `data` rỗng → báo "Không thể lấy thông tin người dùng" và KHÔNG điều hướng. Bấm lần hai thì
token đã nằm sẵn trong store nên `useMe` enabled và chạy được.

Lỗi này dính CẢ đăng nhập Google lẫn GitHub (cùng dùng `useFinishSession`).

## What Changes

- Tách `fetchMe()` (+ `ME_QUERY_KEY`) khỏi hook: hàm thuần, đọc token qua interceptor của client.
- `useFinishSession` nạp `me` bằng `queryClient.fetchQuery({ queryKey: ME_QUERY_KEY, queryFn: fetchMe })`
  — không phụ thuộc `enabled` của hook nữa, nên đăng nhập ăn ngay lần bấm đầu.
- `useMe` dùng lại chính `meQueryFn` đó (một nguồn logic, không nhân bản).

## Capabilities

### Modified Capabilities

- `admin-auth`: đăng nhập social vào thẳng ở lần bấm đầu tiên.
