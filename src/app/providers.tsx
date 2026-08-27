import { ConfigProvider, theme, App as AntApp } from "antd";
import viVN from "antd/locale/vi_VN";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect } from "react";
import { queryClient } from "../shared/api/queryClient";
import { useUIStore } from "../shared/stores/uiStore";
import { useIsMobile } from "../shared/hooks/useIsMobile";
import "../shared/styles/global.css";
import "../shared/styles/mobile.css";

/**
 * Sơn nền `body` theo đúng theme đang dùng.
 *
 * <p>Layout cao 100vh nhưng vùng overscroll (kéo quá mép trên/dưới trên điện thoại) và mọi khoảng
 * body chưa bị che vẫn lộ nền trắng mặc định của trình duyệt — ở chế độ tối trông như viền trắng.
 * Phải nằm BÊN TRONG ConfigProvider mới đọc được token của theme hiện hành.
 */
function BodyBackground() {
  const { token } = theme.useToken();
  useEffect(() => {
    document.body.style.background = token.colorBgLayout;
    document.body.style.color = token.colorText;
  }, [token.colorBgLayout, token.colorText]);
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const themeMode = useUIStore((s) => s.theme);
  const isMobile = useIsMobile();

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={viVN}
        // Trên điện thoại nâng cỡ mặc định của MỌI điều khiển antd lên `large` (40px) — đây là cách
        // rẻ nhất để cả app đạt vùng chạm khuyến nghị mà không phải truyền `size` ở từng chỗ gọi.
        componentSize={isMobile ? "large" : undefined}
        theme={{
          algorithm:
            themeMode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: { colorPrimary: "#3F51B5" },
        }}
      >
        <BodyBackground />
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
