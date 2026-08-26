import { type ReactNode } from "react";
import { Space, Typography } from "antd";
import { useIsMobile } from "../hooks/useIsMobile";

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Hàng nút bên phải tiêu đề (desktop) / xuống dòng full-width (điện thoại). */
  actions?: ReactNode;
}

/**
 * Đầu trang quản trị: tiêu đề, mô tả, hàng nút.
 *
 * <p>Trên điện thoại hàng nút xuống dòng và chiếm trọn bề ngang — đặt cạnh tiêu đề như trên laptop
 * thì tiêu đề bị bóp còn nút thì tràn khỏi màn.
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const isMobile = useIsMobile();

  return (
    <div style={{ marginBottom: isMobile ? 12 : 16 }}>
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          gap: isMobile ? 8 : 16,
        }}
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {actions && (
          <Space wrap style={isMobile ? { width: "100%" } : undefined}>
            {actions}
          </Space>
        )}
      </div>
      {description && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          {description}
        </Typography.Paragraph>
      )}
    </div>
  );
}
