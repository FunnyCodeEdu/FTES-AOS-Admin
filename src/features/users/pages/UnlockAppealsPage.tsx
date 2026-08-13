import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Segmented,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { CheckOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import type { TableProps } from "antd";
import { Can } from "../../../shared/permissions";
import { useDecideAppeal, useUnlockAppeals, type UnlockAppeal } from "../api/deviceOversight.api";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<UnlockAppeal["status"], { text: string; color: string }> = {
  PENDING: { text: "Chờ duyệt", color: "gold" },
  APPROVED: { text: "Đã mở khoá", color: "green" },
  REJECTED: { text: "Đã từ chối", color: "red" },
};

/**
 * Hàng đợi đơn xin mở khoá tài khoản.
 *
 * Đơn tới từ người đang bị khoá — họ KHÔNG còn phiên nào (khoá thu hồi hết), nên đơn được gửi qua
 * đường công khai `POST /auth/appeals` và xác thực bằng mật khẩu. Nghĩa là mọi đơn trong bảng này
 * đều đã chứng minh được quyền sở hữu tài khoản; việc của người duyệt là xét NỘI DUNG trình bày,
 * không phải xét danh tính.
 *
 * Cột "Tiền sử" là số lần tài khoản đã bị khoá trước đây — thứ để phân biệt người quên đăng xuất ở
 * máy trường với người bán tài khoản cho cả lớp.
 */
export default function UnlockAppealsPage() {
  const [status, setStatus] = useState<string>("PENDING");
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, error, refetch, isFetching } = useUnlockAppeals(
    status,
    page,
    PAGE_SIZE,
  );
  const decide = useDecideAppeal();

  const confirmDecision = (row: UnlockAppeal, approve: boolean) => {
    let note = "";
    Modal.confirm({
      title: approve ? "Mở khoá tài khoản này?" : "Từ chối đơn?",
      width: 560,
      content: (
        <div>
          <Typography.Paragraph style={{ marginBottom: 8 }}>
            <strong>{row.username ?? row.email}</strong> — bị khoá vì:{" "}
            <em>{row.lockReason ?? "(không ghi lý do)"}</em>
          </Typography.Paragraph>
          {row.violationCount > 1 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 8 }}
              message={`Tài khoản này đã bị khoá ${row.violationCount} lần.`}
            />
          )}
          <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>
            {approve
              ? "Tài khoản sẽ đăng nhập lại được ngay. Ghi chú dưới đây được gửi kèm email."
              : "Tài khoản vẫn bị khoá. Ghi chú dưới đây được gửi kèm email cho người gửi đơn."}
          </Typography.Paragraph>
          <Input.TextArea
            rows={3}
            maxLength={500}
            placeholder="Ghi chú gửi cho người dùng (tuỳ chọn)"
            onChange={(e) => {
              note = e.target.value;
            }}
          />
        </div>
      ),
      okText: approve ? "Mở khoá" : "Từ chối",
      okButtonProps: approve ? undefined : { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        await decide.mutateAsync({ id: row.id, approve, note: note.trim() || undefined });
        message.success(approve ? "Đã mở khoá tài khoản." : "Đã từ chối đơn.");
      },
    });
  };

  const columns: TableProps<UnlockAppeal>["columns"] = [
    {
      title: "Người gửi",
      key: "user",
      width: 220,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Link to={`/users/${row.userId}`}>{row.username ?? "(chưa có username)"}</Link>
          <Typography.Text type="secondary">{row.email}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Trình bày",
      dataIndex: "message",
      key: "message",
      render: (text: string) => (
        <Typography.Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 3, expandable: true }}>
          {text}
        </Typography.Paragraph>
      ),
    },
    {
      title: "Lý do bị khoá",
      dataIndex: "lockReason",
      key: "lockReason",
      width: 260,
      render: (reason: string | null) => (
        <Typography.Text type="secondary">{reason ?? "—"}</Typography.Text>
      ),
    },
    {
      title: "Tiền sử",
      dataIndex: "violationCount",
      key: "violationCount",
      width: 140,
      render: (count: number) =>
        count > 0 ? (
          <Tag color={count >= 2 ? "red" : "orange"}>Đã bị khoá {count} lần</Tag>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (value: UnlockAppeal["status"]) => (
        <Tag color={STATUS_LABEL[value].color}>{STATUS_LABEL[value].text}</Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 190,
      render: (_, row) =>
        row.status === "PENDING" ? (
          <Can permissions={["user.lock"]}>
            <Space>
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => confirmDecision(row, true)}
              >
                Mở khoá
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseOutlined />}
                onClick={() => confirmDecision(row, false)}
              >
                Từ chối
              </Button>
            </Space>
          </Can>
        ) : (
          <Typography.Text type="secondary">
            {row.decisionNote ? row.decisionNote : "Đã xử lý"}
          </Typography.Text>
        ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Typography.Title level={4} style={{ marginBottom: 0 }}>
        Đơn xin mở khoá tài khoản
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Đơn do chính chủ tài khoản gửi (đã xác thực bằng mật khẩu). Mở khoá sẽ cho đăng nhập lại
        ngay; từ chối thì tài khoản vẫn khoá. Cả hai đều gửi email báo kết quả.
      </Typography.Paragraph>

      <Space>
        <Segmented
          value={status}
          onChange={(value) => {
            setStatus(String(value));
            setPage(0);
          }}
          options={[
            { label: "Chờ duyệt", value: "PENDING" },
            { label: "Đã mở khoá", value: "APPROVED" },
            { label: "Đã từ chối", value: "REJECTED" },
            { label: "Tất cả", value: "" },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isFetching}>
          Làm mới
        </Button>
      </Space>

      {isError && (
        <Alert type="error" showIcon message="Không tải được đơn" description={error?.message} />
      )}

      {isLoading ? (
        <Card>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      ) : (
        <Table<UnlockAppeal>
          rowKey="id"
          columns={columns}
          dataSource={data?.items ?? []}
          locale={{ emptyText: <Empty description="Không có đơn nào." /> }}
          pagination={{
            current: page + 1,
            pageSize: PAGE_SIZE,
            total: data?.totalElements ?? 0,
            showSizeChanger: false,
            onChange: (next) => setPage(next - 1),
          }}
        />
      )}
    </Space>
  );
}
