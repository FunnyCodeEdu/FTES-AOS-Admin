import { Button, Result, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useDashboardWidgets } from "./api";
import { QuickActions } from "./QuickActions";
import { WidgetGrid, WidgetGridSkeleton } from "./WidgetGrid";

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboardWidgets();
  const widgets = data ?? [];

  return (
    <div>
      <Typography.Title level={3}>Tổng quan</Typography.Title>

      {/* Lối tắt đứng NGOÀI nhánh loading/error của widget: API thống kê hỏng hay đang tải thì ba
          việc hay làm vẫn bấm được. Gộp vào trong là mất luôn lối vào mỗi lần widget trục trặc. */}
      <QuickActions />

      {isLoading ? (
        <WidgetGridSkeleton />
      ) : isError ? (
        <Result
          status="error"
          title="Không thể tải dashboard"
          subTitle={error?.message}
          extra={
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Thử lại
            </Button>
          }
        />
      ) : (
        <WidgetGrid widgets={widgets} />
      )}
    </div>
  );
}
