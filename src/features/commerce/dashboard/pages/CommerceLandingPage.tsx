import { Card, Typography } from "antd";
import { RevenueWidget } from "../components/RevenueWidget";

export default function CommerceLandingPage() {
  return (
    <div>
      <Typography.Title level={3}>Thương mại</Typography.Title>
      <Card title="Tổng quan doanh thu">
        <RevenueWidget />
      </Card>
    </div>
  );
}
