/*
 * Trang xem thử CHỈ DÙNG KHI DEV — không nằm trong bundle production (Vite chỉ build `index.html`).
 * Mục đích: nhìn được các khối trang chủ ở 375px mà không cần đăng nhập vào hệ thống thật.
 * Dữ liệu bên dưới là giả, nạp thẳng vào cache react-query.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import viVN from "antd/locale/vi_VN";
import { QuickActions } from "./features/dashboard/QuickActions";
import { ME_QUERY_KEY } from "./features/auth/api";
import { teachingKeys } from "./features/instructor-workspace/api/courseScopes";
import { useIsMobile } from "./shared/hooks/useIsMobile";
import "./shared/styles/mobile.css";

const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });

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
  const isMobile = useIsMobile();
  return (
    <ConfigProvider
      locale={viVN}
      componentSize={isMobile ? "large" : undefined}
      theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: "#3F51B5" } }}
    >
      <div style={{ padding: 12, background: "#f5f5f5", minHeight: "100vh" }}>
        <h3 style={{ fontSize: 20, marginBottom: 8 }}>Tổng quan</h3>
        <QuickActions />
      </div>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Frame />
      </MemoryRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
