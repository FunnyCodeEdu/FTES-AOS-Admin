# Verification and release readiness — 2026-11-17

- Backend release baseline: github/production cea41500, includes already-deployed V414/V415/V416. Scoped worktree adds only this feature. Original shared checkout has unrelated unfinished changes and is NOT a release source.
- Backend `mvnw -B -ntp -o -DskipITs verify`: BUILD SUCCESS; 4,156 tests run, zero failures/errors, 22 skipped. Container-backed integration suite was not run locally (Docker Desktop unavailable).
- Actual service-emitted SQL: 30 query shapes plus 30 empty-dataset runs on an owned, unexposed PostgreSQL 16 container on the physical host. Synthetic fixtures only; VN day boundaries, pre/post-payment classification, refund status, coin/cash separation and no double discount verified. Container removed. No production database writes.
- Admin `npm test`: 916 passed, 5 live tests skipped. On current production baseline, 23 focused auth/navigation/report regressions passed; final Vite build/typecheck passes.
- Web tracker: 17 privacy/transport/cleanup tests passed, tsc -b and touched-file ESLint clean. Production webpack build passed. Default Turbopack build cannot resolve this checkout's external node_modules junction; repository fallback used without changing build scripts/config.
- Actual local browser: all four tabs, dedicated login, restricted navigation, desktop 1440x1000 and mobile 390x844 checked with explicitly synthetic UI data. Screenshots and safe UI receipt saved privately under FTES-Admin/.tmp/market-insights-preview. Owned browser and preview servers closed. This is NOT live report/data evidence.
- Production read-only readiness: existing signing material and host BCrypt present, latest database migration 416. No secret values read into output. Provisioner compiles and dry-run passes; it refuses activation until reviewed login runtime exists, verifies scoped reads/denied writes/logout, disables account on verification failure, and writes credentials only under /run mode 0600.

## Release pending

No push, deployment, migration, telemetry collection or live reviewer account activation has occurred for this feature. Await explicit project-owner release approval. Then release scoped Backend → Admin/Web through existing CI/CD, provision one isolated reviewer, verify live permissions and report correctness, and deliver credentials. Never deploy unrelated dirty-checkout edits. `mentor.insights@ftes.vn` is a proposed login identifier; no email inbox was created.

Historical server events are authoritative business history. Browser observations begin only after release; DNT/GPC/opt-out are honored, routes redact dynamic identifiers and exclude query/hash/form content. Reviewer receives pseudonymous journeys and aggregates only. Revenue is the payment-date cohort of orders net of recorded completed refunds, not a refund-date cashflow ledger. Sessions expire after 30 minutes with no normal refresh credential.

## Released and live-verified — 2026-11-17

Explicit human release approval received. All three CI/CD runs succeeded: Backend 44010939954 (95df748f), Admin 44011442964 (69a424a), Web 44010953344 (c2310063). Migration V417 applied; isolated reviewer mentor.insights@ftes.vn enabled with BCrypt. No ordinary identity account or system role created. Actual browser login, 7-day overview, post-payment and 50-row pseudonymous journey verified; unrelated reads/user write denied 401, unexpected report write denied 403, logout invalidates its session. Post-check active sessions 0; credential delivery source remains /run mode 0600, no credential values in this artifact. Live Web browser events started 10:37:34 VN. Actual live screenshot and nonsecret receipt retained privately outside the worktrees.
