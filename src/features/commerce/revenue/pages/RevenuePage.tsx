import { useState } from "react";
import { Alert, Card, DatePicker, Space, Statistic, Table, Tag, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useRevenueReport, type RevenueLine } from "../api/revenue.api";
import { formatVND } from "../../shared/utils";
import type { TableProps } from "antd";

const { RangePicker } = DatePicker;

/** Tên tiếng Việt của từng nhóm sản phẩm; nhóm lạ hiển thị nguyên mã. */
const CATEGORY_LABELS: Record<string, string> = {
  COIN_TOPUP: "Nạp Xu",
  AI_CREDITS: "Gói AI",
  PREMIUM_SUBSCRIPTION: "Gói thành viên",
  COURSE_UNLOCK: "Mở khoá học",
  COURSE_RENEWAL: "Gia hạn khoá học",
  MERCHANDISE: "Vật phẩm",
  VOUCHER: "Voucher",
  UNCLASSIFIED: "Chưa phân loại",
};

const columns: TableProps<RevenueLine>["columns"] = [
  {
    title: "Nhóm",
    dataIndex: "category",
    key: "category",
    render: (c: string) => CATEGORY_LABELS[c] ?? c,
  },
  { title: "Số đơn", dataIndex: "orderCount", key: "orderCount", align: "right" },
  {
    title: "Giá gộp",
    dataIndex: "gross",
    key: "gross",
    align: "right",
    render: (v: number) => formatVND(v),
  },
  {
    title: "Mã giảm",
    dataIndex: "couponDiscount",
    key: "couponDiscount",
    align: "right",
    render: (v: number) => formatVND(v),
  },
  {
    title: "Xu đã dùng",
    dataIndex: "coinDiscount",
    key: "coinDiscount",
    align: "right",
    render: (v: number) => formatVND(v),
  },
  {
    title: "Tiền thực thu",
    dataIndex: "netCash",
    key: "netCash",
    align: "right",
    render: (v: number) => <strong>{formatVND(v)}</strong>,
  },
];

/**
 * Bảng thống kê doanh thu theo nhóm sản phẩm (nạp Xu, gói AI, gói thành viên, mở khoá học…).
 *
 * <p>Cột kết toán là phần đáng tin cậy nhất của trang: tổng "tiền thực thu" sau khi phân bổ chiết
 * khấu phải khớp đúng tổng ghi trên đơn. Lệch thì trang KÊU thay vì lặng lẽ đưa ra con số sai.
 *
 * <p>Đơn nhập từ hệ thống cũ (`is_legacy`) không nằm trong báo cáo: chúng ghi tổng tiền nhưng bỏ
 * trống đơn giá từng dòng nên không tách được theo nhóm sản phẩm.
 */
export default function RevenuePage() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(30, "day"), dayjs()]);
  const from = range[0].format("YYYY-MM-DD");
  const to = range[1].format("YYYY-MM-DD");
  const { data, isLoading, error } = useRevenueReport(from, to);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Space align="center" style={{ justifyContent: "space-between", width: "100%" }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Thống kê doanh thu
        </Typography.Title>
        <RangePicker
          value={range}
          allowClear={false}
          onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
        />
      </Space>

      {error ? <Alert type="error" message="Không tải được báo cáo doanh thu" showIcon /> : null}

      {data && !data.totals.balanced ? (
        <Alert
          type="warning"
          showIcon
          message="Số liệu chưa khớp sổ"
          description={`Tổng tiền thực thu lệch ${formatVND(
            data.totals.variance,
          )} so với tổng ghi trên đơn (${formatVND(
            data.totals.orderTotalSum,
          )}). Cần soi lại trước khi dùng để đối soát.`}
        />
      ) : null}

      <Space size="large" wrap>
        <Card>
          <Statistic
            title="Tiền thực thu"
            value={data?.totals.netCash ?? 0}
            formatter={(v) => formatVND(Number(v))}
          />
        </Card>
        <Card>
          <Statistic
            title="Mã giảm đã dùng"
            value={data?.totals.couponDiscount ?? 0}
            formatter={(v) => formatVND(Number(v))}
          />
        </Card>
        <Card>
          <Statistic
            title="Xu đã dùng"
            value={data?.totals.coinDiscount ?? 0}
            formatter={(v) => formatVND(Number(v))}
          />
        </Card>
        <Card>
          <Statistic title="Số đơn" value={data?.totals.orderCount ?? 0} />
        </Card>
        <Card>
          {/* Xu tồn là NỢ phải trả: người dùng đã có Xu nhưng chưa tiêu, nền tảng còn phải phục vụ. */}
          <Statistic
            title="Xu còn trong ví người dùng"
            value={data?.coin.outstandingVnd ?? 0}
            formatter={(v) => formatVND(Number(v))}
          />
          <Typography.Text type="secondary">
            {(data?.coin.outstandingCoin ?? 0).toLocaleString("vi-VN")} Xu · 1 Xu ={" "}
            {formatVND(data?.coin.vndPerCoin ?? 0)}
          </Typography.Text>
        </Card>
      </Space>

      <Card>
        <Table<RevenueLine>
          rowKey="category"
          loading={isLoading}
          dataSource={data?.lines ?? []}
          columns={columns}
          pagination={false}
          summary={() =>
            data ? (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <strong>Tổng</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  {data.totals.orderCount}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  {formatVND(data.totals.gross)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  {formatVND(data.totals.couponDiscount)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  {formatVND(data.totals.coinDiscount)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <strong>{formatVND(data.totals.netCash)}</strong>{" "}
                  {data.totals.balanced ? <Tag color="green">khớp sổ</Tag> : null}
                </Table.Summary.Cell>
              </Table.Summary.Row>
            ) : null
          }
        />
      </Card>
    </Space>
  );
}
