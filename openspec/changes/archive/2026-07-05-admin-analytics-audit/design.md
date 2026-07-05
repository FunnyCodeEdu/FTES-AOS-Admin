# Design — admin-analytics-audit

## 1. Route & màn hình

| Route | Màn hình | Layout / thành phần chính |
|---|---|---|
| `/` | Dashboard theo tầng | Composition động theo permission: grid các **widget block**. Super Admin (`analytics.view.overview`): KPI cards users/revenue/engagement/AI cost + mini chart mỗi mảng + link tới dashboard domain. Admin mảng: các widget domain mình có `analytics.view.<domain>`. Moderator (`analytics.view.moderation`): queue stats (pending theo loại, xử lý 7 ngày, thời gian xử lý TB). CTV (`analytics.view.contribution` scoped): contribution stats trong scope (đóng góp được duyệt/từ chối, hoạt động gần đây) + scope picker nếu nhiều scope |
| `/analytics/:domain` | Domain Dashboard | `domain ∈ {learning, subject, community, ai, gamification, business}`; header: date range picker (preset 7/30/90 ngày + custom) + nút Export CSV; body: 3-6 chart (line/bar/pie qua `@ant-design/charts`) + bảng breakdown server-side pagination |
| `/system/audit` | Audit Log Viewer | Bảng chỉ đọc server-side pagination; filter actor (search user), action, domain, khoảng thời gian; drawer detail: metadata + **diff before/after** (2 cột hoặc unified, highlight field thay đổi); không có bất kỳ nút mutation nào |
| `/system/security-log` | Security Log Viewer | Bảng chỉ đọc: loại event (login bất thường / account lock / permission change), user liên quan, IP/device, thời gian, mức độ; filter loại + user + thời gian; drawer detail |

## 2. Permission gates

| Permission | Gate |
|---|---|
| `analytics.view.overview` | Widget tổng quan mọi mảng trên `/` (preset Super Admin) |
| `analytics.view.learning` / `.subject` / `.community` / `.ai` / `.gamification` / `.business` | Widget domain trên `/` + route `/analytics/:domain` tương ứng + nav item |
| `analytics.view.moderation` | Widget queue stats trên `/` (preset Moderator + admin mảng liên quan) |
| `analytics.view.contribution` | Widget contribution stats trên `/` (CTV — luôn scoped grant, FE filter theo scope) |
| `analytics.export` | Nút Export CSV trên các domain dashboard |
| `audit.view` | Nav + route `/system/audit` (preset Super Admin; có thể cấp thêm) |
| `security.log.view` | Nav + route `/system/security-log` |

- `/` không bao giờ 403: user luôn có ít nhất 1 widget theo preset; nếu (edge case) không có
  permission analytics nào → hiển thị welcome card không số liệu.
- `/analytics/:domain` thiếu `analytics.view.<domain>` → 403 page kèm permission thiếu; nav chỉ
  hiện domain có quyền.
- CTV: mọi query contribution tự gắn `scopeType/scopeId` từ scoped grants; không có
  `audit.view`/`security.log.view` trong preset CTV/Moderator → hai viewer ngoài scope của họ.
- Audit/security log **immutable**: FE không render bất kỳ affordance sửa/xoá; API layer không
  khai báo endpoint mutation cho 2 resource này.

## 3. API contract tiêu thụ

Envelope `{code, message, data|null}`. **Assumption**: nhóm `/analytics` và `/audit` dựa trên
change `admin-api` bên FTES-AOS-Backend; các dòng (A) chưa có spec BE, cần bổ sung.

| Method | Path | Quyền | Request / Response chính |
|---|---|---|---|
| GET | `/api/v1/admin/analytics/overview` (A) | `analytics.view.overview` | Query: `from,to` → `data: {users: KpiBlock, revenue: KpiBlock, engagement: KpiBlock, aiCost: KpiBlock}` (`KpiBlock = {value, delta, series[]}`) |
| GET | `/api/v1/admin/analytics/domains/:domain` (A) | `analytics.view.<domain>` | Query: `from,to` → `data: {kpis: KpiBlock[], charts: ChartData[], breakdown?: {columns, rowsUrl}}` |
| GET | `/api/v1/admin/analytics/domains/:domain/breakdown` (A) | `analytics.view.<domain>` | Query: `from,to,page,pageSize,sort` → `data: {items[], total}` |
| GET | `/api/v1/admin/analytics/domains/:domain/export` (A) | `analytics.export` | Query: `from,to` → file CSV (Content-Disposition attachment) |
| GET | `/api/v1/admin/analytics/moderation-stats` (A) | `analytics.view.moderation` | → `data: {pendingByType, resolved7d, avgResolutionHours}` |
| GET | `/api/v1/admin/analytics/contribution-stats` (A) | `analytics.view.contribution` | Query: `scopeType,scopeId,from,to` → `data: {approved, rejected, pending, recentActivity[]}` |
| GET | `/api/v1/admin/audit/logs` | `audit.view` | Query: `page,pageSize,actorId,action,domain,from,to` → `data: {items: AuditEntry[], total}` (`AuditEntry = {id, actor, action, domain, targetType, targetId, createdAt}`) |
| GET | `/api/v1/admin/audit/logs/:id` | `audit.view` | → `data: AuditEntryDetail` (thêm `{before, after, metadata, ip}`) |
| GET | `/api/v1/admin/audit/security-events` (A) | `security.log.view` | Query: `page,pageSize,type(login_anomaly\|account_lock\|permission_change),userId,from,to` → `data: {items: SecurityEvent[], total}` |
| GET | `/api/v1/admin/users/search` | (đã có từ `admin-user-console`) | Query: `q` → `data: UserBrief[]` — dùng cho filter actor |

Không tồn tại endpoint POST/PUT/DELETE nào cho audit/security log (immutable by contract).

## 4. State & data

- Query keys: `['analytics','overview', range]`, `['analytics','domain', domain, range]`,
  `['analytics','domain', domain, 'breakdown', range, pagination]`,
  `['analytics','moderation-stats']`, `['analytics','contribution', scope, range]`,
  `['audit','logs', filters]`, `['audit','logs', id]`, `['audit','security', filters]`.
- Dashboard `/`: mỗi widget là 1 query độc lập (`useQueries` không cần — mỗi widget component
  tự useQuery) → widget lỗi không kéo sập cả trang; `staleTime: 60s`.
- Không có mutation nào trong change này → không có invalidation phức tạp; refetch bằng nút
  refresh trên từng widget/bảng.
- Date range: giữ trong URL search params (`?from=&to=`), default 30 ngày; đổi range → key mới.
- Zustand: tái dùng scope store của CTV từ `admin-ctv-program` (`useCtvScopeStore`) cho
  contribution widget; không thêm store mới.
- Export CSV: gọi endpoint export bằng fetch riêng (không qua TanStack Query), hiển thị loading
  trên nút, tải file qua blob + `a[download]`.

## 5. Luồng nghiệp vụ chính

**Flow 1 — Đăng nhập từng tầng thấy dashboard của mình:**
1. Sau login, FE đã có permission list (từ `admin-foundation`).
2. `/` render `DashboardComposer`: map permission → danh sách widget; sắp theo thứ tự ưu tiên
   (overview trước, domain sau, moderation/contribution cuối).
3. Super Admin: 4 KPI + widget domain; Moderator: chỉ queue stats; CTV: contribution + scope
   picker (nhiều scope). Widget nào query lỗi → error card cục bộ + retry, các widget khác vẫn sống.

**Flow 2 — Domain dashboard + export:**
1. Admin-community mở `/analytics/community`, đổi range 90 ngày → URL cập nhật, chart refetch.
2. Bấm Export CSV (có `analytics.export`) → nút loading → tải file `community_2026-04-04_2026-07-03.csv`.
3. Nhánh lỗi: export 403 → notification lỗi permission; export timeout → notification retry.

**Flow 3 — Điều tra qua audit log:**
1. Super Admin mở `/system/audit`, filter actor=X + domain=commerce + 7 ngày.
2. Click entry "refund.approve" → drawer: metadata + diff before/after (order status, amount)
   highlight field đổi.
3. Copy link (filter nằm trong URL) gửi cho admin khác có `audit.view`.
4. Nhánh lỗi: entry detail 404 (id sai) → drawer hiển thị not-found state.

**Flow 4 — Rà security log:**
1. Super Admin mở `/system/security-log`, filter type=login_anomaly 24h.
2. Thấy chuỗi login lạ của user Y → mở drawer xem IP/device → điều hướng sang
   `/users/:id` (console user) để khoá account (hành động khoá thuộc `admin-user-console`,
   ngoài scope change này).

## 6. UX states

- Loading: KPI card → skeleton số + sparkline; chart → skeleton khối đúng kích thước chart;
  bảng → skeleton rows. Skeleton mirror layout thật.
- Empty: range không có dữ liệu → chart hiển thị empty state "Không có dữ liệu trong khoảng này";
  audit/security filter không match → Empty + gợi ý nới filter.
- Error: widget lỗi → error card cục bộ + nút thử lại (không chặn trang); bảng lỗi → Result +
  retry; export lỗi → notification.
- Confirm-on-destructive: change này KHÔNG có mutation nguy hiểm (toàn bộ read-only) — không có
  confirm dialog nào; mọi affordance ghi/xoá bị cấm trên audit/security log.
- Timezone: mọi timestamp hiển thị theo timezone trình duyệt kèm tooltip ISO UTC.
