import { ConfigProvider, theme, App as AntApp } from "antd";
import viVN from "antd/locale/vi_VN";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { queryClient } from "../shared/api/queryClient";
import { useUIStore } from "../shared/stores/uiStore";

export function AppProviders({ children }: { children: ReactNode }) {
  const themeMode = useUIStore((s) => s.theme);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={viVN}
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
