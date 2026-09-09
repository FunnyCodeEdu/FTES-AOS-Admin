# Tasks — admin-challenge-authoring-ux

## 1. AI generation UX

- [x] 1.1 Replace raw code enum labels with Project/Sandbox labels and learner/grading descriptions.
- [x] 1.2 Add per-draft Sandbox/Project + GITHUB/FILE/BOTH/file-extension controls.
- [x] 1.3 Build canonical batch payloads and validate file-project whitelist.
- [x] 1.4 Block Sandbox drafts without test cases.

## 2. Complete edit hydration

- [x] 2.1 Add challenge-detail query key/hook for `GET /admin/challenges/{id}`.
- [x] 2.2 Wait for current fetch and hydrate once per open challenge; preserve dirty form state.
- [x] 2.3 Extend DTO/form/diff with flat question/criteria and compatibility fallback.

## 3. Mutually exclusive Project/Sandbox editor

- [x] 3.1 Show full question/criteria for Project and ESSAY; warn but tolerate incomplete legacy data.
- [x] 3.2 Show feedback/starter/test-case tools only for Sandbox.
- [x] 3.3 Require grading text (and file whitelist where applicable) only on sandbox→Project conversion.
- [x] 3.4 Ensure missing/unrendered form fields never clear hidden grading configuration.
- [x] 3.5 Preserve every non-empty Project question/criteria field; tolerate only fields already
      missing on legacy records.

## 4. Verification

- [x] 4.1 Add unit coverage for payload matrix, HSF 830/702-character round-trip, cache race, legacy
      Sandbox safety, blank-content guards, and flat-field diff (91 targeted tests; full suite 842
      passed, 5 skipped on 2026-09-09).
- [x] 4.2 `npm run typecheck` passes (2026-09-09).
- [x] 4.3 `npm run build` passes (2026-09-09; Vite production build).

> Integrated HSF E2E is the release/deployment gate shared with Backend and is tracked by the parent
> rollout task; it is not executable against the Admin repo alone before that contract is deployed.
