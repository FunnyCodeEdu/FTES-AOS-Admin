import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Descriptions, Empty, Input, List, Result, Row, Select,
  Space, Spin, Statistic, Table, Tabs, Tag, Typography } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, LockOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMe } from "../../auth/api";
import { DateRangePicker, useAnalyticsDateRange } from "../components/DateRangePicker";
import { useMarketActivity, useMarketOverview } from "./api";
import { FEATURE_LABELS, featureLabel, moneyLabel, numberLabel, timeLabel } from "./labels";
import { MarketTrend } from "./MarketTrend";
import type { MarketActivityRow, MarketCohort, MarketFeatureRow } from "./types";

export default function MarketInsightsPage() {
  const { data: me } = useMe();
  const readOnly = me?.permissions.includes("analytics.market.readonly");
  const { range } = useAnalyticsDateRange();
  const [tab, setTab] = useState("overview");
  const [cohort, setCohort] = useState<MarketCohort>("all");
  const [visitorKey, setVisitorKey] = useState("");
  const [visitorInput, setVisitorInput] = useState("");
  const [feature, setFeature] = useState<string | undefined>();
  const [page, setPage] = useState(0);
  const [inputError, setInputError] = useState(false);
  const effectiveCohort = tab === "paid" ? "paid" : cohort;
  const overview = useMarketOverview({ ...range, cohort: effectiveCohort });
  const activity = useMarketActivity({ ...range, cohort: effectiveCohort, page,
    visitorKey: visitorKey || undefined, feature }, tab === "journey");
  useEffect(() => { setPage(0); }, [range.from, range.to, cohort, visitorKey, feature]);

  const journey = (key?: string, selectedFeature?: string) => {
    if (tab === "paid") setCohort("paid");
    setVisitorKey(key ?? ""); setVisitorInput(key ?? ""); setFeature(selectedFeature);
    setInputError(false); setPage(0); setTab("journey");
  };
  const featureColumns = [
    { title: "Tính năng", dataIndex: "feature", render: (value: string) =>
      <Button type="link" style={{ padding: 0 }} onClick={() => journey(undefined, value)}>{featureLabel(value)}</Button> },
    { title: "Hoạt động", dataIndex: "events", render: numberLabel },
    { title: "User đăng nhập", dataIndex: "users", render: numberLabel },
    { title: "User đã trả tiền", dataIndex: "paid_users", render: numberLabel },
    { title: "Hoạt động sau trả tiền", dataIndex: "paid_events", render: numberLabel },
    { title: "Nguồn nghiệp vụ", dataIndex: "server_events", render: numberLabel },
    { title: "Nguồn trình duyệt", dataIndex: "browser_events", render: numberLabel },
  ];
  const data = overview.data;
  const featureTable = (rows: MarketFeatureRow[]) => <Table<MarketFeatureRow> rowKey="feature"
    dataSource={rows} columns={featureColumns} pagination={false} scroll={{ x: 860 }} size="small" />;

  return <Space direction="vertical" size="large" style={{ width: "100%" }}>
    <Space wrap align="start" style={{ width: "100%", justifyContent: "space-between" }}>
      <div>
        <Space wrap><Typography.Title level={3} style={{ margin: 0 }}>Nghiên cứu thị trường</Typography.Title>
          {readOnly && <Tag icon={<LockOutlined />} color="blue">Chỉ xem báo cáo</Tag>}</Space>
        <Typography.Paragraph type="secondary" style={{ margin: "8px 0 0" }}>
          Người dùng làm gì trên FTES, sử dụng gì sau khi mua và tiền thực thu. Múi giờ Việt Nam.
        </Typography.Paragraph>
      </div>
      <Button icon={<ReloadOutlined />} onClick={() => { void overview.refetch(); if (tab === "journey") void activity.refetch(); }}
        loading={overview.isFetching}>Làm mới</Button>
    </Space>
    <Space wrap>
      <DateRangePicker />
      <Select aria-label="Nhóm người dùng" value={effectiveCohort} style={{ width: 235 }}
        disabled={tab === "paid"} onChange={setCohort} options={[
          { value: "all", label: "Tất cả hoạt động" }, { value: "paid", label: "Sau khi đã trả tiền" },
          { value: "free", label: "Trước / chưa trả tiền, khách" },
        ]} />
    </Space>
    {overview.isLoading ? <Card><Spin /><Typography.Paragraph>Đang tổng hợp dữ liệu thực…</Typography.Paragraph></Card>
      : overview.isError ? <Result status="error" title="Chưa tải được báo cáo" subTitle={overview.error.message}
        extra={<Button onClick={() => void overview.refetch()}>Thử lại</Button>} /> : data ? <>
        <Alert showIcon type={data.coverage.browser_started_at ? "info" : "warning"}
          message={data.coverage.browser_started_at
            ? `Dữ liệu trình duyệt bắt đầu từ ${timeLabel(data.coverage.browser_started_at)}`
            : "Chưa có lượt ghé trang/click được ghi nhận. Dữ liệu này bắt đầu sau khi bật bản cập nhật trên web."}
          description="Lịch sử nghiệp vụ đã có vẫn được tổng hợp. Không coi phần lịch sử chưa ghi nhận là người dùng không hoạt động." />
        <Tabs activeKey={tab} onChange={setTab} items={[
          { key: "overview", label: "Tổng quan", children: <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Row gutter={[16, 16]}>
              {[
                ["User hoạt động", data.summary.active_users], ["Trình duyệt ghé web", data.summary.browser_visitors],
                ["Lượt xem trang", data.summary.page_views], ["Khách trả tiền có hoạt động", data.summary.active_paying_users],
              ].map(([title, value]) => <Col xs={24} sm={12} xl={6} key={String(title)}><Card size="small">
                <Statistic title={title} value={value} groupSeparator="." /></Card></Col>)}
            </Row>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}><Card title="Hoạt động theo ngày">
                <MarketTrend label="Số hoạt động theo ngày" points={data.daily.map(d => ({ day: d.day, value: d.events }))} />
              </Card></Col>
              <Col xs={24} lg={12}><Card title="Tiền thực thu sau hoàn tiền của đơn trong kỳ">
                <MarketTrend label="Doanh thu ròng VND theo ngày thanh toán" monetary
                  points={data.revenueDaily.map(d => ({ day: d.day, value: d.net_cash_vnd }))} />
              </Card></Col>
            </Row>
            <Card title="Thanh toán trong kỳ">
              <Row gutter={[16, 24]}>
                <Col xs={24} sm={12} xl={6}><Statistic title="Tiền thu (VND)" value={moneyLabel(data.revenue.gross_cash_vnd)} /></Col>
                <Col xs={24} sm={12} xl={6}><Statistic title="Hoàn tiền đã ghi nhận" value={moneyLabel(data.revenue.refunded_cash_vnd)} /></Col>
                <Col xs={24} sm={12} xl={6}><Statistic title="Còn lại sau hoàn tiền" value={moneyLabel(data.revenue.net_cash_vnd)} /></Col>
                <Col xs={24} sm={12} xl={6}><Statistic title="Đơn đã thanh toán" value={numberLabel(data.revenue.paid_orders)} /></Col>
              </Row>
              <Typography.Paragraph type="secondary" style={{ marginTop: 20, marginBottom: 0 }}>
                Doanh thu luôn theo khoảng ngày đã chọn, không theo bộ lọc hành vi. Xu không cộng vào VND.
                {Number(data.revenue.legacy_date_estimates) > 0 && ` Có ${numberLabel(data.revenue.legacy_date_estimates)} đơn cũ dùng ngày hoàn thành/tạo thay ngày thanh toán bị thiếu.`}
              </Typography.Paragraph>
            </Card>
            <Card title="Tính năng được dùng nhiều nhất">{featureTable(data.features.slice(0, 8))}</Card>
          </Space> },
          { key: "features", label: "Hành vi & tính năng", children: <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Card title="Mức sử dụng tính năng" extra={<Typography.Text type="secondary">Bấm tính năng để xem hành trình</Typography.Text>}>
              {featureTable(data.features)}
            </Card>
            <Card title="Trang thường ghé"><Table rowKey="route" dataSource={data.pages} pagination={{ pageSize: 10 }}
              scroll={{ x: 600 }} columns={[
                { title: "Đường dẫn đã ẩn định danh", dataIndex: "route" },
                { title: "Tính năng", dataIndex: "feature", render: featureLabel },
                { title: "Lượt xem", dataIndex: "views", render: numberLabel },
                { title: "Trình duyệt", dataIndex: "visitors", render: numberLabel },
              ]} locale={{ emptyText: <Empty description="Chưa ghi nhận lượt xem trang trong kỳ" /> }} /></Card>
            <Card title="Các loại hành động đã ghi nhận"><Table rowKey={r => `${r.source}:${r.event_type}`}
              dataSource={data.eventTypes} size="small" pagination={{ pageSize: 10 }} columns={[
                { title: "Hành động", dataIndex: "event_type" }, { title: "Nguồn", dataIndex: "source",
                  render: (v: string) => <Tag>{v === "server" ? "Nghiệp vụ" : "Trình duyệt"}</Tag> },
                { title: "Số lần", dataIndex: "events", render: numberLabel },
                { title: "User đăng nhập", dataIndex: "users", render: numberLabel },
              ]} scroll={{ x: 680 }} /></Card>
          </Space> },
          { key: "paid", label: "Sau thanh toán", children: <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Alert type="info" showIcon message="Chỉ tính hành động xảy ra sau lần trả tiền đầu tiên của chính người dùng"
              description="Gồm thanh toán tiền hoặc Xu; số khách đã trả tiền không phải số người đang có gói còn hạn. Hoạt động trước khi mua không bị gán ngược thành hoạt động trả phí." />
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}><Card><Statistic title="Khách đã trả tiền có hoạt động trong kỳ"
                value={numberLabel(data.summary.active_paying_users)} /></Card></Col>
              <Col xs={24} md={8}><Card><Statistic title="Hoạt động sau thanh toán" value={numberLabel(data.summary.post_payment_events)} /></Card></Col>
              <Col xs={24} md={8}><Card><Statistic title="Khách đã từng trả tiền đến hết kỳ"
                value={numberLabel(data.payerCoverage.known_paying_users)} /></Card></Col>
            </Row>
            <Card title="Mua xong người dùng dùng tính năng nào?">{featureTable(data.features.filter(f => Number(f.paid_events) > 0))}</Card>
          </Space> },
          { key: "journey", label: "Hành trình ẩn danh", children: <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Alert showIcon type="info" message="Chỉ hiển thị mã quan sát và loại hành động"
              description="Không có email, số điện thoại, IP, nội dung trò chuyện, nội dung form hay dữ liệu thanh toán riêng tư." />
            <Space wrap>
              <Input.Search aria-label="Lọc mã quan sát" placeholder="Dán mã quan sát đầy đủ (32 ký tự)" value={visitorInput}
                style={{ width: 340 }} allowClear status={inputError ? "error" : undefined}
                onChange={e => setVisitorInput(e.target.value)} onSearch={value => {
                  const clean = value.trim().toLowerCase();
                  if (clean && !/^[a-f0-9]{32}$/.test(clean)) { setInputError(true); return; }
                  setInputError(false); setVisitorKey(clean); setPage(0);
                }} />
              <Select aria-label="Lọc tính năng" placeholder="Mọi tính năng" allowClear style={{ width: 230 }} value={feature}
                onChange={setFeature} options={Object.entries(FEATURE_LABELS).map(([value, label]) => ({ value, label }))} />
              {(visitorKey || feature) && <Button onClick={() => journey()}>Xóa bộ lọc</Button>}
            </Space>
            {inputError && <Typography.Text type="danger">Chọn mã ở một dòng bên dưới, hoặc nhập đủ 32 ký tự của mã quan sát.</Typography.Text>}
            {activity.isError ? <Result status="error" title="Không tải được hành trình" subTitle={activity.error.message}
              extra={<Button onClick={() => void activity.refetch()}>Thử lại</Button>} /> :
              <Table<MarketActivityRow> loading={activity.isLoading} rowKey="event_key"
              dataSource={activity.data?.items ?? []} pagination={false} size="small" scroll={{ x: 1000 }} columns={[
                  { title: "Thời gian (VN)", dataIndex: "occurred_at", render: timeLabel, width: 180 },
                  { title: "Mã quan sát", dataIndex: "visitor_key", render: (v: string) =>
                    <Button type="link" style={{ padding: 0 }} title={v} onClick={() => journey(v, feature)}>{v.slice(0, 12)}…</Button> },
                  { title: "Tính năng", dataIndex: "feature", render: featureLabel },
                  { title: "Hành động", dataIndex: "event_type" },
                  { title: "Trang", dataIndex: "route", render: (v: string | null) => v ?? "—" },
                  { title: "Nguồn", dataIndex: "source", render: (v: string) => v === "server" ? "Nghiệp vụ" : "Trình duyệt" },
                  { title: "Lúc thực hiện", dataIndex: "paid_at_event", render: (v: boolean) =>
                    <Tag color={v ? "green" : undefined}>{v ? "Sau trả tiền" : "Trước / chưa trả tiền"}</Tag> },
                ]} />}
            <Space wrap>
              <Button icon={<ArrowLeftOutlined />} disabled={page === 0 || activity.isFetching} onClick={() => setPage(p => p - 1)}>Trước</Button>
              <Typography.Text>Trang {page + 1}</Typography.Text>
              <Button icon={<ArrowRightOutlined />} disabled={!activity.data?.hasMore || page >= 200 || activity.isFetching}
                onClick={() => setPage(p => p + 1)}>Tiếp</Button>
            </Space>
            {page >= 200 && activity.data?.hasMore && <Alert type="info"
              message="Đã tới giới hạn bảng hành trình. Hãy thu hẹp khoảng ngày, tính năng hoặc mã quan sát để xem tiếp." />}
          </Space> },
        ]} />
        <Card size="small" title="Nguồn và cách đọc số liệu">
          <Descriptions size="small" column={{ xs: 1, md: 2 }} items={[
            { key: "updated", label: "Lần tổng hợp", children: timeLabel(data.generatedAt) },
            { key: "zone", label: "Múi giờ", children: data.timezone },
          ]} />
          <List size="small" dataSource={data.notes} renderItem={note => <List.Item><Typography.Text type="secondary">{note}</Typography.Text></List.Item>} />
        </Card>
      </> : <Empty description="Chưa có dữ liệu báo cáo" />}
  </Space>;
}
