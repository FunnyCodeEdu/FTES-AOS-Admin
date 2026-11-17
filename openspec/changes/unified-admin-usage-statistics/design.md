## Design
Máy chủ thêm POST /api/v1/auth/admin/login: truy vấn identifier trong miền report nội bộ; nếu tồn tại thì xác thực report và chỉ phát token report hiện có. Nếu không tồn tại, ủy quyền nguyên request cho AuthController.login hiện hữu, giữ nguyên CAPTCHA/MFA/lock/IP/device rules. Không công khai endpoint tra tài khoản và không fallback sau lỗi mật khẩu/khóa. Tài khoản report bị disable vẫn thuộc miền report và không fallback.

Admin dùng duy nhất /login; token report được nhận diện để không lưu refresh/remember và chuyển về /. Alias /login?view=market vẫn hoạt động nhưng hiển thị cùng form. /analytics/market chuyển về /?dashboard=usage, giữ ngày. Root hiển thị overview+usage theo permission; marker readonly chỉ hiển thị usage, mọi route khác chuyển về root, API write vẫn bị từ chối như trước.

Query bổ sung featureDetails(group feature, action, source) trên cùng selected cohort/time. action AI chỉ mở rộng từ payload.feature khi khớp enum allowlist cố định; không có raw payload/PII. Browser action vẫn là quan sát coarse; không đoán chính xác nút đã click. Các công cụ thiếu dữ liệu ghi rõ chưa ghi nhận.

Hoàn tiền là completed cash refunds theo nhóm đơn thanh toán trong kỳ; legacy REFUNDED thiếu ledger giữ fallback hiện hữu. Chỉ đổi nhãn/giải thích, không đổi công thức, không áp bộ lọc hành vi vào doanh thu.

## Validation
Controller dispatch tests: full ordinary request forwarded, no report failure fallback, disabled accounts fail closed. Regressions for existing signature isolation. Isolated PostgreSQL executes all actual query plans and checks AI allowlist excludes private string. UI tests for both dashboards, single login, alias routing, detail labels/search/cohorts/refund explanation. Builds before commit, existing CI/CD only after valid checks under continuing feature release authorization.
