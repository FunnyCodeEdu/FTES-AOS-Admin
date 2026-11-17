## Data model

analytics.browser_events(event_id UUID PK, visitor_id UUID, session_id UUID, actor_id UUID nullable server-derived, event_type VARCHAR, feature VARCHAR, route VARCHAR, occurred_at TIMESTAMPTZ server-time). Index(time), (actor,time), (visitor,time). Chỉ sự kiện enum, route chỉ giữ cấu trúc, đã bỏ query/hash và định danh động. Không lưu IP/user-agent/form/query/payment content.

## API

- POST /api/v1/analytics/browser-events: public optional identity, tối đa 20 sự kiện/batch, chống trùng UUID, hạn mức Redis, không nhận actorId do client tự khai.
- GET /api/v1/admin/analytics/market-insights: quyền analytics.market.view; ngày from/to, cohort all/paid/free; tối đa 366 ngày, thời gian VN.
- GET /api/v1/admin/analytics/market-insights/activity: quyền tương tự, phân trang/key giả danh; chỉ whitelist trường, không raw payload/email/IP/token.

## Kafka

Không thêm topic: raw server events từ activity.activities; telemetry lưu vào bảng analytics riêng, không phát sự kiện hành vi thành điểm thưởng. Không giả lập historical events.

## Redis

ftes:analytics:browser-rate:<hash-ip>:<minute>, TTL 120s; không lưu IP nguyên văn. Cache dashboard ngắn hạn nếu cần. Không thay cache nghiệp vụ.

## Luồng nghiệp vụ

1. Web gửi batch page_view/feature_open/button_click/link_click, tôn trọng DNT/GPC/opt-out, best-effort không chặn học.
2. Query phân biệt sự kiện trình duyệt và server; bỏ bot/system actor, dùng hoạt động thật đã lưu. Tổng tiền dựa vào đơn đã thanh toán, hoàn tiền đã hoàn tất, không tính PENDING/EXPIRED/FAILED.
3. Nhóm từng trả tiền dựa thời điểm thanh toán đầu tiên; chỉ đếm hoạt động sau mốc đó cho báo cáo sau mua. Phần trăm có mẫu số và cửa sổ rõ ràng, không coi correlation là causal attribution.
4. Mentor dùng tài khoản riêng, chỉ thấy dashboard thị trường và báo cáo tổng hợp; lịch sử chỉ có mã giả danh, tên sự kiện/tính năng/ngày.

## Bảo mật & phân quyền

Reviewer nằm trong analytics.market_reviewers và không có identity user/role. Phiên báo cáo có issuer/audience/khoá dẫn xuất riêng, chỉ được chấp nhận trên namespace market-insights. Chỉ GET overview/activity/access và POST login/logout; token này không xác thực ở REST/GraphQL nghiệp vụ. Admin bình thường được thêm analytics.market.view, quyền hiện có giữ nguyên. Mật khẩu BCrypt; định danh mentor.insights@ftes.vn không đồng nghĩa đã tạo mailbox. Chi tiết ranh giới phiên ở mục Reviewer isolation bên dưới.

## K8s/vận hành

Không restart/deploy thủ công. Code + migration + account provisioning kiểm tra trước; xin duyệt phát hành cuối cùng. Vai trò chỉ xem phải được cài trước khi kích hoạt tài khoản. Retention browser events 180 ngày có cleanup theo chunk, không xóa hoạt động gốc.


## Reviewer isolation (final security decision)

Tài khoản đánh giá nằm trong analytics.market_reviewers, không tạo tài khoản identity/users và không có token đăng nhập hệ thống thông thường. Market reviewer JWT dùng HS256, issuer/audience riêng, khoá dẫn xuất có domain separation từ bí mật ký hiện có; token báo cáo không dùng khoá RS256 thông thường hoặc khoá HMAC legacy, đồng thời issuer/audience khác nên các bộ xác thực hệ thống không chấp nhận. Token TTL 30 phút, jti tra phiên chưa thu hồi; logout thu hồi phiên. Trên đúng namespace báo cáo, filter xác minh token trước JWT filter chuẩn và chỉ cho GET overview/activity/access, POST login/logout. Khách admin thông thường tiếp tục dùng xác thực/quyền analytics.market.view. Không có API công khai tạo/sửa reviewer; provision bằng script đặc quyền sau phát hành, mật khẩu BCrypt. Tài khoản dùng địa chỉ đăng nhập nội bộ mentor.insights@ftes.vn; không tuyên bố đã tạo hộp thư email. Frontend /login?view=market dùng luồng riêng, không gọi GraphQL hoặc endpoint quản trị khác với token này. Đây là ranh giới mật mã, không chỉ ẩn nút hay dựa vào việc mọi service đã áp role guard.
