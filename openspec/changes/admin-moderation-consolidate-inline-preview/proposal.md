## Why

Có HAI màn "duyệt học liệu" trong admin gây rối:
- `/academic/moderation` ("Duyệt đề thi & học liệu") — REST `/resources/moderation/pending`, đã scope
  duyệt phía BE, có drawer duyệt/từ chối + duyệt hàng loạt + preview album FE. Đầy đủ hơn.
- `/academic/resources/review` ("Duyệt học liệu") — màn cũ, GraphQL `adminResources` admin-global,
  không qua scope duyệt, không drawer/bulk.

Chủ sản phẩm quyết GỘP còn một chỗ. Ngoài ra người duyệt phải **tải file về mở tay** mới xem được nội
dung — chậm và phiền.

## What Changes

- BỎ màn cũ `/academic/resources/review` (gỡ route + nav + xoá `ResourceReviewQueuePage`). Giữ
  `/academic/moderation` làm nơi duyệt DUY NHẤT.
- Drawer duyệt xem **nội dung inline**: tải blob (đã watermark) 1 lần rồi render tại chỗ theo mime —
  PDF (`<object>`), ảnh (`<img>`), text (`<pre>` cắt 200KB). Định dạng khác (zip/office) → thông báo +
  nút tải bản gốc. Nút tải giữ làm dự phòng.

## Capabilities

### Modified Capabilities

- `resource-moderation`: một điểm duyệt duy nhất; xem nội dung tệp inline không cần tải về.
