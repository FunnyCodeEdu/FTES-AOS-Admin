import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Modal,
  Row,
  Skeleton,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { TableProps } from "antd";
import { useMyCurrentEarning, useMyEarnings, useRequestPayout } from "../api/payrollMe.api";
import { handleAdminMutationError } from "../../../shared/api/errors";
import { MIN_PAYOUT } from "../../payroll/constants";
import { STATUS_LABEL, formatDate, formatVnd, statusTagColor } from "../../payroll/format";
import type { Earning, EarningStatus, PayrollDeduction } from "../shared/types";

function StatusTag({ status }: { status: EarningStatus }) {
  return <Tag color={statusTagColor(status)}>{STATUS_LABEL[status]}</Tag>;
}

export default function MyEarningsPage() {
  const {
    data: current,
    isLoading: currentLoading,
    isError: currentError,
    error: currentErrorObj,
  } = useMyCurrentEarning();
  const { data: earnings, isLoading, isError, error } = useMyEarnings();
  const requestPayout = useRequestPayout();

  const canRequest =
    current?.status === "OPEN" && (current?.netPayable ?? 0) >= MIN_PAYOUT && !requestPayout.isPending;

  const onRequestPayout = () => {
    if (!current) return;
    Modal.confirm({
      title: "Yêu cầu chi trả",
      content: `Chuyển kỳ lương hiện tại (thực nhận ${formatVnd(
        current.netPayable
      )}) sang trạng thái chờ duyệt. Sau khi gửi, bạn không thể chỉnh sửa cho tới khi quản trị viên xử lý. Tiếp tục?`,
      okText: "Yêu cầu chi trả",
      cancelText: "Huỷ",
      onOk: () =>
        requestPayout.mutateAsync().then(
          () => {
            message.success("Đã gửi yêu cầu chi trả. Kỳ lương chuyển sang chờ duyệt.");
          },
          (err) => {
            handleAdminMutationError(err);
            throw err;
          }
        ),
    });
  };

  const columns: TableProps<Earning>["columns"] = [
    { title: "Ngày tạo", dataIndex: "createdAt", key: "createdAt", render: formatDate },
    { title: "Lương cơ bản", dataIndex: "grossRevenue", key: "grossRevenue", render: formatVnd },
    { title: "Phụ cấp", dataIndex: "allowance", key: "allowance", render: formatVnd },
    { title: "Tổng chi phí", dataIndex: "totalDeduction", key: "totalDeduction", render: formatVnd },
    { title: "Tổng nhận", dataIndex: "netPayable", key: "netPayable", render: formatVnd },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: EarningStatus) => <StatusTag status={status} />,
    },
    { title: "Ngày trả", dataIndex: "paidAt", key: "paidAt", render: formatDate },
  ];

  const deductionColumns: TableProps<PayrollDeduction>["columns"] = [
    { title: "Loại", dataIndex: "type", key: "type", render: (t: string) => <strong>{t}</strong> },
    { title: "Mô tả", dataIndex: "description", key: "description" },
    { title: "Số tiền", dataIndex: "amount", key: "amount", render: formatVnd },
  ];

  return (
    <div>
      <Typography.Title level={3}>Lương của tôi</Typography.Title>

      {currentLoading ? (
        <Card loading style={{ marginBottom: 16 }} />
      ) : currentError ? (
        <Alert
          type="error"
          message="Không thể tải kỳ lương hiện tại"
          description={currentErrorObj?.message}
          style={{ marginBottom: 16 }}
          showIcon
        />
      ) : !current ? (
        <Alert
          type="info"
          message="Chưa có kỳ lương hiện tại"
          style={{ marginBottom: 16 }}
          showIcon
        />
      ) : (
        <Card title="Kỳ lương hiện tại" style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={16}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Lương cơ bản">{formatVnd(current.grossRevenue)}</Descriptions.Item>
                <Descriptions.Item label="Phụ cấp">{formatVnd(current.allowance)}</Descriptions.Item>
                <Descriptions.Item label="Tổng chi phí">{formatVnd(current.totalDeduction)}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <StatusTag status={current.status} />
                </Descriptions.Item>
              </Descriptions>
            </Col>
            <Col span={8} style={{ textAlign: "right" }}>
              <Statistic title="Thực nhận" value={current.netPayable} formatter={(v) => formatVnd(Number(v))} />
              <Button
                type="primary"
                style={{ marginTop: 12 }}
                loading={requestPayout.isPending}
                disabled={!canRequest}
                onClick={onRequestPayout}
              >
                Yêu cầu chi trả
              </Button>
              {current.status === "OPEN" && current.netPayable < MIN_PAYOUT && (
                <div style={{ marginTop: 4 }}>
                  <Typography.Text type="secondary">
                    Cần tối thiểu {formatVnd(MIN_PAYOUT)} để yêu cầu chi trả.
                  </Typography.Text>
                </div>
              )}
            </Col>
          </Row>
        </Card>
      )}

      <Card title="Lịch sử lương">
        {isLoading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : isError ? (
          <Alert type="error" message="Không thể tải lịch sử lương" description={error?.message} showIcon />
        ) : (earnings?.length ?? 0) === 0 ? (
          <Empty description="Chưa có kỳ lương nào" />
        ) : (
          <Table<Earning>
            columns={columns}
            dataSource={(earnings ?? []).map((e) => ({ ...e, key: e.id }))}
            rowKey="id"
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: 12 }}>
                  <Typography.Title level={5}>Chi tiết chi phí</Typography.Title>
                  {record.deductions.length > 0 ? (
                    <Table<PayrollDeduction>
                      columns={deductionColumns}
                      dataSource={record.deductions.map((d) => ({ ...d, key: d.id }))}
                      rowKey="id"
                      pagination={false}
                      size="small"
                    />
                  ) : (
                    <Typography.Text type="secondary">Không có khoản chi phí nào.</Typography.Text>
                  )}
                </div>
              ),
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50"],
              showTotal: (total) => `Tổng ${total} kỳ lương`,
            }}
          />
        )}
      </Card>
    </div>
  );
}
