## Why

Ô "Giá gốc" ở tab Giá & gói luôn trống + banner "chưa đọc được giá" vì query `adminCourse` không trả
giá. BE nay đã trả totalPrice/salePrice (Backend #178) → FE tiêu thụ để prefill.

## What Changes

- `ADMIN_COURSE_QUERY` + `AdminCourseGql`: +totalPrice, +salePrice.
- `mapAdminCourseToDetail`: `basePrice = totalPrice`, `salePrice = salePrice`.
- Type `Course`: +salePrice?.
- PricingTab KHÔNG đổi — nó init field từ `course.basePrice`, nên prefill + tắt banner + bật nút Lưu
  tự động khi giá đã đọc được. Đường GHI giá gốc vốn chạy → giờ hoạt động thấy được.

## Capabilities

### Modified Capabilities

- `academic-course-console`: admin đọc & sửa được giá gốc khoá (ô prefill, lưu không còn "như mất").
