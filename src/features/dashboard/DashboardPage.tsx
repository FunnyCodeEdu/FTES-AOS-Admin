import { Button, Empty, Result, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useWidgets } from "./api";
import { usePermittedWidgets, WidgetGrid, WidgetGridSkeleton } from "./WidgetGrid";

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useWidgets();
  const widgets = data?.widgets ?? [];
  const permitted = usePermittedWidgets(widgets);

  return (
    <div>
      <Typography.Title level={3}>Tổng quan</Typography.Title>
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
      ) : widgets.length === 0 ? (
        <Empty description="Bạn chưa được cấp quyền xem thống kê" style={{ marginTop: 48 }} />
      ) : permitted.length === 0 ? (
        <Empty description="Bạn không có quyền xem các widget này" style={{ marginTop: 48 }} />
      ) : (
        <WidgetGrid widgets={permitted} />
      )}
    </div>
  );
}
