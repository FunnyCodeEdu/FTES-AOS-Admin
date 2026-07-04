import { Card, Col, Row, Skeleton, Statistic, Typography } from "antd";
import { useRevenueSummary } from "../../payments/api/payments.api";
import { formatVND } from "../../shared/utils";

export function RevenueWidget() {
  const { data, isLoading } = useRevenueSummary();

  if (isLoading) return <Skeleton active paragraph={{ rows: 4 }} />;

  return (
    <div>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic title="Hôm nay" value={data?.today ?? 0} formatter={(v) => formatVND(Number(v))} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="7 ngày" value={data?.last7d ?? 0} formatter={(v) => formatVND(Number(v))} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="30 ngày" value={data?.last30d ?? 0} formatter={(v) => formatVND(Number(v))} />
          </Card>
        </Col>
      </Row>
      <Typography.Title level={5} style={{ marginTop: 16 }}>
        Doanh thu theo loại sản phẩm
      </Typography.Title>
      <Row gutter={16}>
        {data?.byProductType.map((item) => (
          <Col span={8} key={item.productType}>
            <Card>
              <Statistic title={item.productType} value={item.amount} formatter={(v) => formatVND(Number(v))} />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
