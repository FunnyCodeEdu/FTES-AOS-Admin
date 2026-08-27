/*
 * Trang xem thử CHỈ DÙNG KHI DEV — không nằm trong bundle production (Vite chỉ build `index.html`).
 * Mục đích: nhìn được các khối trang chủ ở 375px mà không cần đăng nhập vào hệ thống thật.
 * Dữ liệu bên dưới là giả, nạp thẳng vào cache react-query.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { AppProviders } from "./app/providers";
// AppProviders dùng queryClient dùng chung của app — phải nạp dữ liệu giả vào ĐÚNG client đó.
import { queryClient as client } from "./shared/api/queryClient";
import AdminLayout from "./app/layout/AdminLayout";
import { QuickActions } from "./features/dashboard/QuickActions";
import { ME_QUERY_KEY } from "./features/auth/api";
import { teachingKeys } from "./features/instructor-workspace/api/courseScopes";



client.setQueryData(ME_QUERY_KEY, {
  user: { id: "u1", email: "haind@ftes.vn", fullName: "Nguyễn Đức Hải" },
  permissions: [],
  scopedGrants: [],
  superAdmin: true,
});

client.setQueryData(teachingKeys.all, [
  {
    id: "c1",
    title: "Toán rời rạc MAD101",
    slugName: "mad101",
    courseCode: "MAD101",
    level: "BASIC",
    status: "PUBLISHED",
    saleMode: "LEGACY",
    totalPrice: 1200000,
    salePrice: null,
    totalUser: 320,
  },
  {
    id: "c2",
    title: "Giải tích và ứng dụng trong kỹ thuật phần mềm MAE101",
    slugName: "mae101",
    courseCode: "MAE101",
    level: "BASIC",
    status: "DRAFT",
    saleMode: "PACKAGE",
    totalPrice: null,
    salePrice: null,
    totalUser: 0,
  },
]);

function Frame() {
  // Dùng ĐÚNG AppProviders + AdminLayout của app thật để đo được header, Drawer và nền theme.
  return (
    <AppProviders>
      <AdminLayout>
        <h3 style={{ fontSize: 20, marginBottom: 8 }}>Tổng quan</h3>
        <QuickActions />
      </AdminLayout>
    </AppProviders>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MemoryRouter>
      <Frame />
    </MemoryRouter>
  </React.StrictMode>
);
