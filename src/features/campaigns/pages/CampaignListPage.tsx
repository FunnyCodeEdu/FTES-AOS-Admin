import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Can } from "../../../shared/permissions";
import { MobileCard } from "../../../shared/components/MobileCard";
import { ResponsiveTable } from "../../../shared/components/ResponsiveTable";
import { DeleteConfirmModal } from "../../../shared/components/DeleteConfirmModal";
import {
  useCampaigns,
  useCreateCampaign,
  useDeleteCampaign,
  useUpdateCampaign,
  type AdminCampaign,
  type CampaignStatus,
} from "../api/campaigns.api";

const STATUS_META: Record<CampaignStatus, { label: string; color: string }> = {
  DRAFT: { label: "Bản nháp", color: "default" },
  ACTIVE: { label: "Đang phát", color: "green" },
  ENDED: { label: "Đã dừng", color: "red" },
};

/** Giá trị form (dayjs cho 2 ô thời gian) — tách khỏi payload gửi BE (ISO string). */
interface FormValues {
  code: string;
  title: string;
  description?: string;
  coinAmount: number;
  window?: [dayjs.Dayjs | null, dayjs.Dayjs | null];
  maxClaims?: number | null;
  status: CampaignStatus;
}

function formatVnd(n: number): string {
  return n.toLocaleString("vi-VN");
}

function formatWindow(c: AdminCampaign): string {
  const from = c.startsAt ? dayjs(c.startsAt).format("DD/MM/YYYY HH:mm") : "không giới hạn";
  const to = c.endsAt ? dayjs(c.endsAt).format("DD/MM/YYYY HH:mm") : "không giới hạn";
  return `${from} → ${to}`;
}

/**
 * Console "Chương trình thưởng": admin tạo các chương trình cho người dùng bấm NHẬN Xu
 * (vd Quốc khánh 2/9 nhận 29.000 Xu). Mỗi người nhận một lần cho mỗi chương trình — BE chặn bằng
 * UNIQUE (campaign, user) + khoá idempotency ở ví nên bấm nhiều lần không cộng Xu lần hai.
 */
export default function CampaignListPage() {
  const { data, isLoading, isError, error, refetch } = useCampaigns();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();

  const [form] = Form.useForm<FormValues>();
  const [editing, setEditing] = useState<AdminCampaign | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<AdminCampaign | null>(null);

  useEffect(() => {
    if (!formOpen) return;
    if (editing) {
      form.setFieldsValue({
        code: editing.code,
        title: editing.title,
        description: editing.description ?? undefined,
        coinAmount: editing.coinAmount,
        window: [
          editing.startsAt ? dayjs(editing.startsAt) : null,
          editing.endsAt ? dayjs(editing.endsAt) : null,
        ],
        maxClaims: editing.maxClaims ?? undefined,
        status: editing.status,
      });
    } else {
      form.setFieldsValue({
        code: "",
        title: "",
        description: undefined,
        coinAmount: 29000,
        window: undefined,
        maxClaims: undefined,
        status: "ACTIVE",
      });
    }
  }, [formOpen, editing, form]);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const payload = {
        code: values.code.trim().toUpperCase(),
        title: values.title.trim(),
        description: values.description,
        coinAmount: values.coinAmount,
        startsAt: values.window?.[0] ? values.window[0]!.toISOString() : null,
        endsAt: values.window?.[1] ? values.window[1]!.toISOString() : null,
        maxClaims: values.maxClaims ?? null,
        status: values.status,
      };
      if (editing) {
        // Mã chương trình là khoá đối soát, BE không nhận đổi — chỉ gửi phần sửa được.
        const { code: _code, ...rest } = payload;
        updateCampaign.mutate(
          { id: editing.id, values: rest },
          {
            onSuccess: () => {
              message.success("Đã lưu chương trình");
              closeForm();
            },
          }
        );
      } else {
        createCampaign.mutate(payload, {
          onSuccess: () => {
            message.success("Đã tạo chương trình");
            closeForm();
          },
        });
      }
    });
  };

  const columns: ColumnsType<AdminCampaign> = [
    {
      title: "Chương trình",
      key: "title",
      render: (_v, c) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{c.title}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {c.code}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Xu / người",
      dataIndex: "coinAmount",
      key: "coinAmount",
      width: 130,
      render: (v: number) => <strong>{formatVnd(v)}</strong>,
    },
    {
      title: "Thời gian",
      key: "window",
      width: 280,
      render: (_v, c) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {formatWindow(c)}
        </Typography.Text>
      ),
    },
    {
      title: "Đã phát",
      key: "claims",
      width: 130,
      render: (_v, c) => (
        <span>
          {c.claimCount}
          {c.maxClaims ? ` / ${c.maxClaims}` : ""} lượt
        </span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s: CampaignStatus) => (
        <Tag color={STATUS_META[s]?.color}>{STATUS_META[s]?.label ?? s}</Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 180,
      render: (_v, c) => (
        <Can permissions={["campaign.manage"]}>
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(c);
                setFormOpen(true);
              }}
            >
              Sửa
            </Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => setDeleting(c)}>
              Xoá
            </Button>
          </Space>
        </Can>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Chương trình thưởng</Typography.Title>
      <Typography.Paragraph type="secondary">
        Chương trình cho người dùng bấm <strong>Nhận</strong> để cộng Xu (vd Quốc khánh 2/9 nhận
        29.000 Xu). Mỗi người nhận <strong>một lần</strong> cho mỗi chương trình.
      </Typography.Paragraph>

      <Card>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space wrap style={{ justifyContent: "flex-end", width: "100%" }}>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Làm mới
            </Button>
            <Can permissions={["campaign.manage"]}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Tạo chương trình
              </Button>
            </Can>
          </Space>

          {isError && (
            <Alert
              type="error"
              showIcon
              message="Không tải được danh sách chương trình"
              description={error?.message}
              action={
                <Button size="small" onClick={() => refetch()}>
                  Thử lại
                </Button>
              }
            />
          )}

          {isLoading && !data ? (
            <Skeleton active paragraph={{ rows: 5 }} />
          ) : (
            <ResponsiveTable<AdminCampaign>
              rowKey="id"
              columns={columns}
              dataSource={data ?? []}
              size="small"
              locale={{ emptyText: <Empty description="Chưa có chương trình nào" /> }}
              pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
              renderMobileCard={(campaign) => (
                <MobileCard
                  title={campaign.title}
                  subtitle={
                    <>
                      <Tag color={STATUS_META[campaign.status]?.color} style={{ marginInlineEnd: 6 }}>
                        {STATUS_META[campaign.status]?.label ?? campaign.status}
                      </Tag>
                      {campaign.code}
                    </>
                  }
                  meta={[
                    { label: "Xu mỗi người", value: <strong>{formatVnd(campaign.coinAmount)}</strong> },
                    {
                      label: "Đã phát",
                      value: `${campaign.claimCount}${campaign.maxClaims ? ` / ${campaign.maxClaims}` : ""} lượt`,
                    },
                    { label: "Thời gian", value: formatWindow(campaign) },
                  ]}
                  extra={
                    <Can permissions={["campaign.manage"]}>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label="Xoá chương trình"
                        onClick={() => setDeleting(campaign)}
                      />
                    </Can>
                  }
                  primaryAction={
                    <Can permissions={["campaign.manage"]}>
                      <Button
                        block
                        size="large"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setEditing(campaign);
                          setFormOpen(true);
                        }}
                      >
                        Sửa chương trình
                      </Button>
                    </Can>
                  }
                />
              )}
            />
          )}
        </Space>
      </Card>

      <Modal
        open={formOpen}
        title={editing ? `Sửa chương trình · ${editing.title}` : "Tạo chương trình thưởng"}
        onCancel={closeForm}
        onOk={handleSubmit}
        okText={editing ? "Lưu" : "Tạo"}
        cancelText="Huỷ"
        confirmLoading={createCampaign.isPending || updateCampaign.isPending}
        destroyOnClose
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="code"
            label="Mã chương trình"
            tooltip="Mã ổn định để đối soát, vd QUOCKHANH29. Không đổi được sau khi tạo."
            rules={[{ required: true, message: "Nhập mã chương trình" }]}
          >
            <Input placeholder="QUOCKHANH29" disabled={!!editing} />
          </Form.Item>
          <Form.Item
            name="title"
            label="Tên hiển thị"
            rules={[{ required: true, message: "Nhập tên chương trình" }]}
          >
            <Input placeholder="Quốc khánh 2/9 — nhận 29.000 Xu" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Lời nhắn hiển thị cho người dùng" />
          </Form.Item>
          <Space align="start" wrap>
            <Form.Item
              name="coinAmount"
              label="Số Xu mỗi người nhận"
              rules={[{ required: true, message: "Nhập số Xu" }]}
            >
              <InputNumber min={1} step={1000} style={{ width: 200 }} />
            </Form.Item>
            <Form.Item
              name="maxClaims"
              label="Giới hạn tổng lượt"
              tooltip="Để trống = không giới hạn."
            >
              <InputNumber min={1} placeholder="không giới hạn" style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
              <Select
                style={{ width: 160 }}
                options={[
                  { value: "DRAFT", label: "Bản nháp" },
                  { value: "ACTIVE", label: "Đang phát" },
                  { value: "ENDED", label: "Đã dừng" },
                ]}
              />
            </Form.Item>
          </Space>
          <Form.Item
            name="window"
            label="Thời gian phát"
            tooltip="Để trống = không giới hạn phía đó. Ngoài khoảng này người dùng không nhận được."
          >
            <DatePicker.RangePicker showTime allowEmpty={[true, true]} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {deleting && (
        <DeleteConfirmModal
          open={!!deleting}
          title="Xoá chương trình"
          description={
            <>
              Xoá <strong>{deleting.title}</strong> — kèm lịch sử {deleting.claimCount} lượt đã nhận.
              Xu đã phát <strong>không</strong> bị thu hồi (sổ ví là sổ độc lập). Muốn dừng phát mà
              giữ lịch sử thì đổi trạng thái sang “Đã dừng” thay vì xoá.
            </>
          }
          loading={deleteCampaign.isPending}
          onConfirm={() =>
            deleteCampaign.mutate(
              { id: deleting.id },
              {
                onSuccess: () => {
                  message.success("Đã xoá chương trình");
                  setDeleting(null);
                },
              }
            )
          }
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
