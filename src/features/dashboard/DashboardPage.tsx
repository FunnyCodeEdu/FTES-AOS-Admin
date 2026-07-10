import { Button, Result, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useDashboardWidgets } from "./api";
import { WidgetGrid, WidgetGridSkeleton } from "./WidgetGrid";

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboardWidgets();
  const widgets = data ?? [];

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
      ) : (
        <WidgetGrid widgets={widgets} />
      )}
    </div>
  );
}
