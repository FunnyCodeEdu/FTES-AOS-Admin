# Design — admin-challenge-authoring-ux

## 1. Domain matrix

| Workflow | Type persisted | submissionMethod | Nội dung tạo | Bề mặt sửa |
| --- | --- | --- | --- | --- |
| Project | `CODE` | `GITHUB`, `FILE`, `BOTH` | AI `question`/`criteria`, không test case | GitHub/ZIP + đề/rubric AI |
| Code Sandbox | `CODING` (tạo mới canonical) | vắng | test cases | runner/test-case |
| Legacy Code Sandbox | `CODE` | vắng | dữ liệu cũ | runner/test-case |
| SQL Sandbox | `SQL` | vắng | test cases/seed | runner SQL |

`CODE` không còn là nhãn đủ rõ cho người dùng. UI luôn diễn giải workflow; payload builder mới là
nơi map workflow về contract.

## 2. AI draft review and batch payload

`ChallengeGenerateModal` giữ `CodeDraftSettings` theo index draft. Khi polling trả kết quả, CODE mặc
định Project+BOTH+.zip, CODING mặc định Sandbox; mentor có thể đổi từng draft trước khi tạo.

Pure builder `buildAiBatchChallengeItems` áp invariant:

- Project: `type=CODE`, có `submissionMethod`; grading config `mode=AI` + explicit question/criteria;
  chỉ giữ fileExtension khi FILE/BOTH; xoá `pass_ratio`; `testCases=null`.
- Sandbox: `type=CODING`, không submissionMethod; giữ test cases AI trả.
- Draft không phải code giữ mapping cũ.

Validation cục bộ chặn FILE/BOTH khi whitelist rỗng, tránh rollback cả batch bằng response 400.
Sandbox không có test case cũng bị chặn vì nhãn đã cam kết chấm test case nhưng payload đó không có
gì để chấm.

## 3. Authoring detail hydration

Danh sách by-lesson/course là read-model mỏng, không phải nguồn cho edit form. Hook mới dùng query key
`exerciseKeys.challengeDetail(id)` và gọi `GET /admin/challenges/{id}`.

Form dùng hai guard:

1. `detailQuery.isFetching` khoá form/nút Lưu, kể cả khi React Query đang giữ cached `data`.
2. `hydratedChallengeId` bảo đảm mỗi challenge trong một lần mở chỉ `setFieldsValue` một lần. Focus và
   reconnect bị tắt refetch để response nền không reset dirty state.

Nếu detail lỗi, list row là fallback có cảnh báo. Payload diff coi field form `undefined` là “control
không hiện/không biết”, tuyệt đối không biến thành chuỗi/map rỗng.

## 4. Full question and criteria

Backend detail lộ flat `question` và `criteria`; `resolveOriginalAuthoringText` ưu tiên hai field đó,
fallback parse `gradingConfig` để tương thích cache/fixture cũ. Form phân biệt `description` là summary
với hai nội dung AI chấm.

PATCH gửi flat field chỉ khi control có mặt và text thực sự đổi. Frontend không serialize lại toàn bộ
grading JSON; backend merge key nên `fileExtension`, `seedSql`, `starterCode` và key tương lai sống
nguyên.

## 5. Backward compatibility

- CODE không submissionMethod là legacy sandbox: không render/require question/criteria.
- CODE có submissionMethod nhưng thiếu question hoặc criteria: hiện cảnh báo, không chặn sửa metadata.
- Field question/criteria nào của Project đang có nội dung thì rule form và payload builder đều chặn
  xoá trắng; chỉ field vốn thiếu ở record legacy mới không bắt buộc.
- Chỉ sandbox→Project mới require cả hai; FILE/BOTH đồng thời require whitelist.
- Khi Project đang chọn, ẩn AI-feedback/starter/test-case controls. Nút “Giữ Code Sandbox” xoá lựa
  chọn chưa lưu và trở lại bề mặt test-case.

## 6. Verification strategy

Pure unit tests khoá matrix payload, fallback detail, stale-cache hydration, partial patch không xoá
key ẩn và HSF-size content (question 830 ký tự, criteria 702 ký tự). Typecheck + production build là
gate cuối của repo Admin; E2E tích hợp HSF chạy sau khi Backend contract được deploy.
