## Why

Anh cần admin gán NGÀNH cho môn (workplace môn). Một môn có thể thuộc NHIỀU ngành (nhiều-nhiều).
Learner đã lọc môn theo ngành; admin chưa sửa được ngành của môn.

## What Changes

- Type: `Major` + `SubjectDetail.majors`.
- API: `useMajors` (GET /admin/majors) + `useUpdateSubjectMajors` (PUT /admin/subjects/{id}/majors).
- `SubjectInfoTab`: control **"Ngành"** — Select multiple (nhiều ngành) + nút Lưu riêng (replace toàn
  bộ tập ngành), gated <Can subject.manage>. (Kì đã có ở đợt trước.)

## Capabilities

### Modified Capabilities

- `subject-management`: admin gán nhiều ngành cho môn.
