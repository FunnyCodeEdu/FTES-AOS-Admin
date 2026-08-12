import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Form,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { EditOutlined, ReloadOutlined } from "@ant-design/icons";
import { Can } from "../../../shared/permissions";
import {
  useDeleteModelTier,
  useModelCatalog,
  useModelConfigs,
  useUpdateModelConfig,
  useUpsertModelTier,
} from "../api";
import type { LockedBehavior, ModelCatalogItem, ModelConfig } from "../types";

interface EditFormValues {
  model: string; // catalog id
  fallbackModel?: string; // catalog id
  limitDay?: number;
  limitMonth?: number;
  isActive: boolean;
  /** Mốc chi tiêu (VNĐ) của model CHÍNH — ghi vào ai.model_tiers, không phải model_configs. */
  minSpendVnd?: number;
  lockedBehavior?: LockedBehavior;
}

export default function AiModelConfigPage() {
  const { data, isLoading, isError, error, refetch } = useModelConfigs();
  const { data: catalog } = useModelCatalog();
  const update = useUpdateModelConfig();
  const upsertTier = useUpsertModelTier();
  const deleteTier = useDeleteModelTier();

  const [editing, setEditing] = useState<ModelConfig | null>(null);
  const [form] = Form.useForm<EditFormValues>();

  const catalogItems = catalog?.models ?? [];
  const catalogById = useMemo(() => {
    const map = new Map<string, ModelCatalogItem>();
    catalogItems.forEach((m) => map.set(m.id, m));
    return map;
  }, [catalogItems]);

  // Gom theo nhà cung cấp: catalog giờ trộn OpenRouter + Groq (Groq chỉ gồm model OpenRouter KHÔNG
  // có), và một danh sách phẳng khiến người chọn không biết mình đang đổi sang nhà nào.
  const modelOptions = useMemo(() => {
    const byProvider = new Map<string, { value: string; label: string }[]>();
    catalogItems.forEach((m) => {
      const group = byProvider.get(m.provider) ?? [];
      group.push({ value: m.id, label: m.label });
      byProvider.set(m.provider, group);
    });
    return [...byProvider.entries()].map(([provider, options]) => ({
      label: provider === "groq" ? "Groq (chỉ model OpenRouter không có)" : "OpenRouter",
      options,
    }));
  }, [catalogItems]);

  useEffect(() => {
    if (editing) {
      form.setFieldsValue({
        model: editing.modelName,
        fallbackModel: editing.fallbackModelName ?? undefined,
        limitDay: editing.params?.limits?.DAY,
        limitMonth: editing.params?.limits?.MONTH,
        isActive: editing.active,
        minSpendVnd: editing.minSpendVnd || undefined,
        lockedBehavior: editing.lockedBehavior ?? "DOWNGRADE",
      });
    }
  }, [editing, form]);

  const columns = [
    {
      title: "Tính năng",
      dataIndex: "feature",
      render: (feature: string) => <Typography.Text strong>{feature}</Typography.Text>,
    },
    {
      title: "Model hiện tại",
      dataIndex: "modelName",
      render: (modelName: string, record: ModelConfig) => {
        const item = catalogById.get(modelName);
        return (
          <span>
            {item?.label ?? modelName}
            <br />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.providerKey}
            </Typography.Text>
          </span>
        );
      },
    },
    {
      title: "Fallback",
      dataIndex: "fallbackModelName",
      render: (fallback: string | null | undefined) =>
        fallback ? catalogById.get(fallback)?.label ?? fallback : <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: "Giới hạn NGÀY",
      render: (_: unknown, record: ModelConfig) =>
        record.params?.limits?.DAY ?? "-",
    },
    {
      title: "Giới hạn THÁNG",
      render: (_: unknown, record: ModelConfig) =>
        record.params?.limits?.MONTH ?? "-",
    },
    {
      // `active` là tên BE thật sự trả (Jackson đổi `isActive()` → `active`). Đọc `isActive` như
      // trước làm MỌI dòng hiện "Tắt"; tầng api đã chuẩn hoá cả hai nên ở đây chỉ đọc `active`.
      title: "Trạng thái",
      dataIndex: "active",
      render: (active: boolean) =>
        active ? <Tag color="green">Bật</Tag> : <Tag>Tắt</Tag>,
    },
    {
      title: "Mốc chi tiêu",
      dataIndex: "minSpendVnd",
      render: (minSpend: number | undefined, record: ModelConfig) => {
        if (!minSpend) {
          return <Typography.Text type="secondary">Mở cho mọi người</Typography.Text>;
        }
        return (
          <span>
            <Tag color="gold">{minSpend.toLocaleString("vi-VN")}đ</Tag>
            <br />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.lockedBehavior === "BLOCK" ? "chưa đủ → chặn" : "chưa đủ → hạ fallback"}
            </Typography.Text>
          </span>
        );
      },
    },
    {
      title: "Thao tác",
      render: (_: unknown, record: ModelConfig) => (
        <Can permissions={["ai.admin.manage"]}>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => setEditing(record)}
          >
            Sửa
          </Button>
        </Can>
      ),
    },
  ];

  const handleSubmit = (values: EditFormValues) => {
    if (!editing) return;
    const modelItem = catalogById.get(values.model);
    const fallbackItem = values.fallbackModel
      ? catalogById.get(values.fallbackModel)
      : undefined;

    const limits: { DAY?: number; MONTH?: number } = {};
    if (values.limitDay != null) limits.DAY = values.limitDay;
    if (values.limitMonth != null) limits.MONTH = values.limitMonth;

    update.mutate(
      {
        feature: editing.feature,
        body: {
          providerKey: modelItem?.provider ?? editing.providerKey,
          modelName: values.model,
          fallbackProviderKey: fallbackItem?.provider ?? null,
          fallbackModelName: values.fallbackModel ?? null,
          params: {
            ...editing.params,
            limits,
          },
          isActive: values.isActive,
          lockedBehavior: values.lockedBehavior ?? "DOWNGRADE",
        },
      },
      {
        onSuccess: () => {
          // Mốc chi tiêu nằm ở bảng KHÁC (ai.model_tiers, khoá theo model) nên phải gọi riêng —
          // và chỉ gọi khi người dùng thực sự đổi, để không ghi đè mốc mà admin khác vừa đặt cho
          // cùng model đó từ một feature khác.
          const nextTier = values.minSpendVnd ?? 0;
          const prevTier = editing.minSpendVnd ?? 0;
          const modelChanged = values.model !== editing.modelName;
          if (nextTier !== prevTier || modelChanged) {
            if (nextTier > 0) {
              upsertTier.mutate({ modelName: values.model, minSpendVnd: nextTier });
            } else if (prevTier > 0 && !modelChanged) {
              deleteTier.mutate(values.model);
            }
          }
          message.success("Đã cập nhật cấu hình model");
          setEditing(null);
        },
        onError: (err) => {
          message.error(err.message ?? "Cập nhật thất bại");
        },
      }
    );
  };

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: "space-between", width: "100%" }} align="center">
        <Typography.Title level={3} style={{ margin: 0 }}>
          Cấu hình AI
        </Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
          Tải lại
        </Button>
      </Space>

      <Card>
        {isError ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={error?.message ?? "Lỗi tải cấu hình"}
          >
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Thử lại
            </Button>
          </Empty>
        ) : (
          <Table
            rowKey="feature"
            columns={columns}
            dataSource={data ?? []}
            loading={isLoading}
            pagination={false}
          />
        )}
      </Card>

      <Modal
        title={`Cấu hình model — ${editing?.feature ?? ""}`}
        open={editing !== null}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        confirmLoading={update.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Model"
            name="model"
            rules={[{ required: true, message: "Vui lòng chọn model" }]}
          >
            <Select
              options={modelOptions}
              placeholder="Chọn model"
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item label="Model dự phòng (fallback)" name="fallbackModel">
            <Select
              options={modelOptions}
              placeholder="Chọn model dự phòng"
              showSearch
              optionFilterProp="label"
              allowClear
            />
          </Form.Item>
          <Form.Item label="Giới hạn / NGÀY" name="limitDay">
            <InputNumber min={0} style={{ width: "100%" }} placeholder="Không giới hạn" />
          </Form.Item>
          <Form.Item label="Giới hạn / THÁNG" name="limitMonth">
            <InputNumber min={0} style={{ width: "100%" }} placeholder="Không giới hạn" />
          </Form.Item>
          <Form.Item
            label="Mốc chi tiêu để được dùng model này"
            name="minSpendVnd"
            extra="Tính theo MAX(đơn đã trả lớn nhất, tổng đã trả trong kỳ hiện tại). Bỏ trống hoặc 0 = mở cho mọi người. Mốc gắn với MODEL nên áp cho mọi tính năng đang dùng model đó."
          >
            <InputNumber
              min={0}
              step={50000}
              style={{ width: "100%" }}
              placeholder="0 = mở cho mọi người"
              formatter={(v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "")}
              parser={(v) => Number((v ?? "").replace(/\./g, "")) as 0}
              addonAfter="đ"
            />
          </Form.Item>
          <Form.Item
            label="Khi học viên chưa đủ mốc"
            name="lockedBehavior"
            extra="Hạ cấp cho tính năng học tập (học viên vẫn dùng được); chặn cho tính năng chấm điểm (chấm bằng model kém rồi trả điểm sai còn tệ hơn)."
          >
            <Select
              options={[
                { value: "DOWNGRADE", label: "Hạ xuống model dự phòng" },
                { value: "BLOCK", label: "Chặn, mời nâng cấp" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Kích hoạt" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
