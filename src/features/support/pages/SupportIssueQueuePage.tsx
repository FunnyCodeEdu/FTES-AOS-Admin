import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { BugOutlined, EyeOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { TableProps } from "antd";
import {
  type IssueCategory,
  type IssueStatus,
  type SupportIssue,
  useSupportIssues,
  useUpdateSupportIssue,
} from "../api/supportIssues.api";

const CATEGORY_LABELS: Record<IssueCategory, string> = {
  AI: "AI / FrosTES",
  VIDEO: "Video",
  CHALLENGE: "Thử thách",
  PAYMENT: "Thanh toán",
  OTHER: "Khác",
};

const STATUS_LABELS: Record<IssueStatus, string> = {
  OPEN: "Mới",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã xử lý",
  CLOSED: "Đã đóng",
};

const STATUS_COLORS: Record<IssueStatus, string> = {
  OPEN: "red",
  IN_PROGRESS: "gold",
  RESOLVED: "green",
  CLOSED: "default",
};

export default function SupportIssueQueuePage() {
  const [status, setStatus] = useState<IssueStatus | undefined>();
  const [category, setCategory] = useState<IssueCategory | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<SupportIssue | null>(null);
  const [nextStatus, setNextStatus] = useState<IssueStatus>("OPEN");
  const [note, setNote] = useState("");
  const query = useSupportIssues({ status, category, page: page - 1, size: pageSize });
  const update = useUpdateSupportIssue();

  const open = (issue: SupportIssue) => {
    setSelected(issue);
    setNextStatus(issue.status);
    setNote(issue.adminNote ?? "");
  };

  const save = () => {
    if (!selected) return;
    update.mutate(
      { id: selected.id, status: nextStatus, adminNote: note.trim() || undefined },
      {
        onSuccess: (updated) => {
          message.success("Đã cập nhật ticket");
          setSelected(updated);
        },
        onError: (error) => message.error(error.message),
      }
    );
  };

  const columns: TableProps<SupportIssue>["columns"] = [
    {
      title: "Ticket",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.title}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {row.reporterEmail || row.reporterUsername || row.reporterId}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Tính năng",
      dataIndex: "category",
      width: 150,
      render: (value: IssueCategory) => <Tag>{CATEGORY_LABELS[value]}</Tag>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 140,
      render: (value: IssueStatus) => <Tag color={STATUS_COLORS[value]}>{STATUS_LABELS[value]}</Tag>,
    },
    {
      title: "Gửi lúc",
      dataIndex: "createdAt",
      width: 170,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Thao tác",
      width: 110,
      render: (_, row) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => open(row)}>
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Space align="center" style={{ marginBottom: 16 }}>
        <BugOutlined style={{ fontSize: 24 }} />
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>Báo lỗi kỹ thuật</Typography.Title>
          <Typography.Text type="secondary">Ticket do học viên gửi từ AI, video và các tính năng trên hệ thống.</Typography.Text>
        </div>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            allowClear
            placeholder="Tính năng"
            value={category}
            style={{ width: 170 }}
            options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
            onChange={(value) => { setCategory(value); setPage(1); }}
          />
          <Select
            allowClear
            placeholder="Trạng thái"
            value={status}
            style={{ width: 150 }}
            options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            onChange={(value) => { setStatus(value); setPage(1); }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => query.refetch()}>Làm mới</Button>
        </Space>
      </Card>

      {query.isError && (
        <Alert
          type="error"
          showIcon
          message="Không thể tải danh sách báo lỗi"
          description={query.error.message}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={query.data?.items ?? []}
        loading={query.isLoading}
        pagination={{
          current: page,
          pageSize,
          total: query.data?.total ?? 0,
          showSizeChanger: true,
          onChange: (nextPage, nextSize) => { setPage(nextPage); setPageSize(nextSize); },
        }}
      />

      <Drawer
        title="Chi tiết báo lỗi"
        width={640}
        open={!!selected}
        onClose={() => setSelected(null)}
        extra={<Button type="primary" loading={update.isPending} onClick={save}>Lưu cập nhật</Button>}
      >
        {selected && (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Mã ticket">{selected.id}</Descriptions.Item>
              <Descriptions.Item label="Người gửi">
                {selected.reporterUsername || "—"} · {selected.reporterEmail || selected.reporterId}
              </Descriptions.Item>
              <Descriptions.Item label="Tính năng">{CATEGORY_LABELS[selected.category]}</Descriptions.Item>
              <Descriptions.Item label="Tiêu đề">{selected.title}</Descriptions.Item>
              <Descriptions.Item label="Mô tả"><Typography.Paragraph style={{ whiteSpace: "pre-wrap", margin: 0 }}>{selected.description}</Typography.Paragraph></Descriptions.Item>
              <Descriptions.Item label="Trang lỗi"><a href={selected.pageUrl} target="_blank" rel="noreferrer">Mở đúng trang người dùng báo lỗi</a></Descriptions.Item>
              <Descriptions.Item label="Thời gian">{dayjs(selected.createdAt).format("DD/MM/YYYY HH:mm:ss")}</Descriptions.Item>
            </Descriptions>

            <Card size="small" title="Ngữ cảnh tự động">
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {JSON.stringify(selected.context, null, 2)}
              </pre>
            </Card>

            <div>
              <Typography.Text strong>Trạng thái xử lý</Typography.Text>
              <Select
                value={nextStatus}
                style={{ width: "100%", marginTop: 8 }}
                options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                onChange={setNextStatus}
              />
            </div>
            <div>
              <Typography.Text strong>Ghi chú nội bộ</Typography.Text>
              <Input.TextArea
                rows={5}
                maxLength={2000}
                showCount
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Nguyên nhân, cách xử lý hoặc thông tin cần theo dõi thêm"
                style={{ marginTop: 8 }}
              />
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  );
}
