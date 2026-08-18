# Sửa: tải slide/tài liệu lên bài học ở Admin luôn hỏng

## Why

Trong Admin, đính tài liệu (slide, PDF) vào một buổi học **không bao giờ thành công** — cả ở popup
"Bài học mới" lẫn ở màn soạn bài học. Người soạn chọn file, bấm lưu, và nhận về một lỗi khó hiểu.

Nguyên nhân không nằm ở kho lưu trữ mà ở client. `coreClient` khai `Content-Type: application/json`
làm mặc định cho mọi request. Axios v1 khi thấy body là `FormData` **và** content-type là JSON thì
nó **chuyển FormData thành JSON** thay vì gửi multipart:

```js
// axios/dist/node/axios.cjs — transformRequest
if (isFormData) {
  return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
}
```

`File` qua `JSON.stringify` thành `{}`, nên thứ đi tới server là
`{"file":{},"title":"slide.pptx"}` với content-type JSON. Endpoint BE khai
`consumes = multipart/form-data` nên trả **415 Unsupported Media Type** — file không hề rời khỏi
trình duyệt.

Mọi đường upload khác trong Admin (tài nguyên, blog, kho câu hỏi, đề challenge, bài tập, album FE)
đều đã xoá mặc định đó bằng `headers: { "Content-Type": undefined }`. Chỉ hai chỗ của tài liệu bài
học là quên — đó chính là hai chỗ người dùng báo hỏng.

Ghi chú thêm cho khỏi truy nhầm hướng: **kho lưu trữ đã là Cloudflare R2** (`R2FileStorage` mang
`@Primary`, mọi caller upload thẳng lên R2). Lỗi này xảy ra trước khi request chạm tới tầng lưu trữ,
nên đổi provider không sửa được nó.

## What Changes

- Hai lời gọi tải tài liệu bài học gửi đúng `multipart/form-data` thay vì JSON.
- Khoá lại bằng test đi qua chính `coreClient` thật, khẳng định body tới tầng gửi vẫn còn là
  `FormData` chứ không phải chuỗi JSON.

## Impact

- Affected specs: `admin-lesson-document-upload-multipart`
- Affected code: `src/features/academic/lessons/api/lessons.api.ts`
- Không đụng BE, không đổi endpoint, không đổi kho lưu trữ.
