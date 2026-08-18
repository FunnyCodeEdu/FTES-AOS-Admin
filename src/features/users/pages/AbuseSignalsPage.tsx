import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Modal,
  Segmented,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { CheckOutlined, ReloadOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import type { TableProps } from "antd";
import { Can } from "../../../shared/permissions";
import { useAbuseSignals, useResolveAbuseSignal, type AbuseSignal } from "../api/abuseSignals.api";

const PAGE_SIZE = 20;

const SEVERITY: Record<string, { text: string; color: string }> = {
  THROTTLED: { text: "Đã chặn (429)", color: "gold" },
  LOCKED: { text: "Đã tự khoá", color: "red" },
};

const KIND: Record<string, string> = {
  CRAWL_CONTENT: "Cào đề",
  SPAM: "Spam",
};

/**
 * Báo cáo cào đề / lạm dụng (BE change `exam-scrape-guard`).
 *
 * Mỗi dòng là MỘT lần detector chặn hoặc tự khoá một tài khoản mở quá nhiều đề khác nhau trong một
 * cửa sổ thời gian. Dòng `LOCKED` = tài khoản đã bị khoá (đi qua đường khoá admin, người dùng gửi
 * được đơn kháng nghị); dòng `THROTTLED` = mới chỉ bị chặn 429, chưa khoá.
 *
 * "Đánh dấu đã xử lý" KHÔNG mở khoá tài khoản — nó chỉ dọn dòng khỏi danh sách việc cần xem. Mở khoá
 * là quyết định riêng: qua đơn kháng nghị (màn "Đơn xin mở khoá") hoặc nút khoá/mở ở màn tài khoản.
 * Hai việc tách nhau có chủ đích ở BE, nên nút ở đây cũng không gộp.
 */
export default function AbuseSignalsPage() {
  const [status, setStatus] = useState<string>("OPEN");
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, error, refetch, isFetching } = useAbuseSignals(
    status,
    page,
    PAGE_SIZE,
  );
  const resolve = useResolveAbuseSignal();

  const confirmResolve = (row: AbuseSignal) => {
    Modal.confirm({
      title: "Đánh dấu tín hiệu này đã xử lý?",
      content:
        "Chỉ dọn dòng khỏi danh sách việc cần xem. KHÔNG mở khoá tài khoản — nếu tài khoản đang bị "
        + "khoá, việc mở khoá làm ở đơn kháng nghị hoặc màn tài khoản.",
      okText: "Đã xử lý",
      cancelText: "Huỷ",
      onOk: async () => {
        await resolve.mutateAsync({ id: row.id });
        message.success("Đã đánh dấu.");
      },
    });
  };

  const columns: TableProps<AbuseSignal>["columns"] = [
    {
      title: "Tài khoản",
      dataIndex: "username",
      key: "username",
      render: (_: unknown, row) => (
        <Link to={`/users/${row.userId}`}>{row.username ?? row.userId}</Link>
      ),
    },
    {
      title: "Loại",
      dataIndex: "kind",
      key: "kind",
      render: (kind: string) => <Tag>{KIND[kind] ?? kind}</Tag>,
    },
    {
      title: "Mức",
      dataIndex: "severity",
      key: "severity",
      render: (severity: string) => {
        const s = SEVERITY[severity] ?? { text: severity, color: "default" };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: "Đề khác nhau / giờ",
      dataIndex: "distinctCount",
      key: "distinctCount",
      render: (distinct: number, row) => (
        <Tooltip title={`${row.requestCount} request trong giờ · ${row.strikes} lần bị chặn`}>
          <Typography.Text strong>{distinct}</Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: "Lúc",
      dataIndex: "detectedAt",
      key: "detectedAt",
      render: (at: string) => new Date(at).toLocaleString("vi-VN"),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (s: string) =>
        s === "RESOLVED" ? <Tag color="green">Đã xử lý</Tag> : <Tag color="blue">Đang mở</Tag>,
    },
    {
      title: "",
      key: "action",
      render: (_: unknown, row) =>
        row.status === "OPEN" ? (
          <Can permissions={["user.lock"]}>
            <Button
              size="small"
              icon={<CheckOutlined />}
              loading={resolve.isPending}
              onClick={() => confirmResolve(row)}
            >
              Đã xử lý
            </Button>
          </Can>
        ) : null,
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <div>
        <Typography.Title level={4} style={{ marginBottom: 4 }}>
          Báo cáo cào đề / lạm dụng
        </Typography.Title>
        <Typography.Text type="secondary">
          Tài khoản bị chặn hoặc tự khoá do mở quá nhiều đề khác nhau trong thời gian ngắn. Dòng
          “Đã tự khoá” tức tài khoản đang bị khoá và có thể gửi đơn kháng nghị.
        </Typography.Text>
      </div>

      <Card size="small">
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Segmented
            value={status}
            onChange={(next) => {
              setStatus(String(next));
              setPage(0);
            }}
            options={[
              { label: "Đang mở", value: "OPEN" },
              { label: "Đã xử lý", value: "RESOLVED" },
              { label: "Tất cả", value: "" },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isFetching}>
            Làm mới
          </Button>
        </Space>
      </Card>

      {isError ? (
        <Alert type="error" showIcon message="Không tải được báo cáo" description={error?.message} />
      ) : null}

      {isLoading ? (
        <Card>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      ) : (
        <Table<AbuseSignal>
          rowKey="id"
          columns={columns}
          dataSource={data?.items ?? []}
          locale={{ emptyText: <Empty description="Chưa có tín hiệu lạm dụng nào." /> }}
          pagination={{
            current: page + 1,
            pageSize: PAGE_SIZE,
            total: data?.totalElements ?? 0,
            onChange: (next) => setPage(next - 1),
            showSizeChanger: false,
          }}
        />
      )}
    </Space>
  );
}
