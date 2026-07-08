## 1. Route + nav gates (Agent 1 — owns routeRegistry.tsx + NavMenu.tsx)

- [x] 1.1 `src/app/routeRegistry.tsx`: đổi mọi `requiredPermissions` theo bảng "Route/nav VIEW gates" trong design.
- [x] 1.2 `src/shared/permissions/NavMenu.tsx`: đổi mọi permission gate của nav item theo cùng bảng (nav phải khớp route để hiện đúng).

## 2. Components — academic + users + rbac + audit (Agent 2a)

- [x] 2.1 Trong `src/features/academic/**`, `src/features/users/**`, `src/features/rbac/**`, `src/features/audit/**`: đổi mọi `Can`/`hasAnyPermission` theo bảng "Action gates" trong design.
- [x] 2.2 Thêm fallback cho mọi `Record<Status|Role,…>` (SubjectTable, UserTable, CourseTable, quiz/pack/resource tables, badges...) theo mục "Status-map robustness". Đặc biệt fix crash `SubjectTable.tsx:31` + `UserTable.tsx:54`.

## 3. Components — commerce + community + moderation + operations + ctv + analytics + ai (Agent 2b)

- [x] 3.1 Trong `src/features/commerce/**`, `src/features/community/**`, `src/features/moderation/**`, `src/features/operations/**`, `src/features/ctv-program/**`, `src/features/ctv-workspace/**`, `src/features/analytics/**`, `src/features/ai/**`: đổi mọi `Can`/`hasAnyPermission` theo bảng "Action gates".
- [x] 3.2 Thêm fallback cho mọi `Record<Status|Role,…>` (order/payment/refund/wallet/coupon/product, post/group/report, banner/announcement/event/flag, ctv, ...) theo "Status-map robustness".

## 4. Verify

- [x] 4.1 `tsc --noEmit -p tsconfig.app.json` sạch.
- [x] 4.2 `npm run build` xanh.
