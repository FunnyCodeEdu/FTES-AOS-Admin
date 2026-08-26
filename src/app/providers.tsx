import { ConfigProvider, theme, App as AntApp } from "antd";
import viVN from "antd/locale/vi_VN";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { queryClient } from "../shared/api/queryClient";
import { useUIStore } from "../shared/stores/uiStore";
import { useIsMobile } from "../shared/hooks/useIsMobile";
import "../shared/styles/mobile.css";

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
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
