import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { Spin } from "antd";
import { createAdminRouter } from "./app/router";
import { authClient } from "./shared/api/client";
import { useAuthStore } from "./features/auth/store";

const router = createAdminRouter();

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export default function App() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const setTokens = useAuthStore((s) => s.setTokens);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (accessToken || !refreshToken) {
      setRestored(true);
      return;
    }

    authClient
      .post<RefreshResponse>("/refresh", { refreshToken })
      .then((res) => {
        const data = res.data as unknown as RefreshResponse;
        setTokens(data.accessToken, data.refreshToken);
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => setRestored(true));
  }, [accessToken, refreshToken, setTokens, clearSession]);

  if (!restored) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* `tip` của Spin chỉ có tác dụng ở dạng bọc con hoặc fullscreen — đặt trực tiếp thì antd
            cảnh báo và chữ không hiện. Màn này chạy MỖI lần mở lại web nên để chữ riêng bên dưới. */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Spin size="large" />
          <span style={{ color: "rgba(0,0,0,0.45)" }}>Đang khôi phục phiên...</span>
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
