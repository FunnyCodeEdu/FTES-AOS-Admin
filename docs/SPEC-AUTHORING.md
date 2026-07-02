# Format chuẩn khi viết OpenSpec change (repo này)

Mỗi change nằm ở `openspec/changes/<change-name>/` gồm:

```
<change-name>/
├── .openspec.yaml          # schema: spec-driven + created: YYYY-MM-DD
├── proposal.md             # Why / What Changes / Capabilities / Impact  (tiếng Việt)
├── design.md               # thiết kế kỹ thuật implementation-ready     (tiếng Việt)
├── tasks.md                # checklist implement                        (tiếng Việt)
└── specs/<capability>/spec.md   # delta spec, requirement tiếng Anh chuẩn SHALL
```

## proposal.md

```markdown
# <change-name> — <tiêu đề ngắn>

## Why
<vấn đề/bối cảnh, tham chiếu tầng quyền trong docs/ADMIN-ARCHITECTURE.md>

## What Changes
- <gạch đầu dòng những gì được thêm/đổi>

## Capabilities
### New Capabilities
- `<capability-slug>`: <1-2 dòng>
### Modified Capabilities
<!-- hoặc ghi chú không sửa capability nào -->

## Impact
- <route mới, feature folder, API BE tiêu thụ, permission gates>
```

## design.md — PHẢI implementation-ready ("run now")

Bắt buộc đủ các mục:

1. **Route & màn hình** — bảng route, layout, thành phần chính từng màn.
2. **Permission gates** — permission leaf nào gate route/nút nào; hành vi khi thiếu quyền
   (ẩn nav, 403 page); scope filter cho CTV.
3. **API contract tiêu thụ** — bảng endpoint BE (`/api/v1/admin/...`): method, path, quyền,
   request/response chính (envelope `{code, message, data|null}`). Nếu BE chưa có spec
   tương ứng, đánh dấu **assumption** rõ ràng.
4. **State & data** — TanStack Query keys, Zustand store (nếu có), invalidation.
5. **Luồng nghiệp vụ chính** — 2-4 flow quan trọng (từng bước, cả nhánh lỗi).
6. **UX states** — loading (skeleton mirror layout), empty, error, confirm-on-destructive.

## specs/<capability>/spec.md — delta spec

```markdown
# <capability-slug>

## ADDED Requirements

### Requirement: <tên requirement>
The system SHALL <hành vi bắt buộc, đo được>.

#### Scenario: <tên scenario>
- **WHEN** <điều kiện/hành động>
- **THEN** <kết quả bắt buộc>
- **AND** <kết quả kèm theo>
```

- Mỗi capability 4–8 requirement; mỗi requirement ≥1 scenario; phủ happy path, lỗi,
  và ràng buộc quyền (đặc biệt: scenario user THIẾU quyền / CTV ngoài scope).

## tasks.md

```markdown
# Tasks — <change-name>

## 1. <nhóm việc>
- [ ] 1.1 <việc cụ thể, trỏ file/feature folder>
...
## N. Verify
- [ ] N.1 npm run build xanh + tsc --noEmit sạch
```

## Quy tắc chung

- Validate bằng `openspec validate <change-name>` trước khi commit.
- 1 change = 1 commit, message `spec(<change-name>): <tóm tắt>`.
- Tầng quyền/permission catalog theo `docs/ADMIN-ARCHITECTURE.md`.
