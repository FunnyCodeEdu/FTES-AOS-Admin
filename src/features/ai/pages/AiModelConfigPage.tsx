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
  useModelCatalog,
  useModelConfigs,
  useUpdateModelConfig,
} from "../api";
import type { ModelCatalogItem, ModelConfig } from "../types";

interface EditFormValues {
  model: string; // catalog id
  fallbackModel?: string; // catalog id
  limitDay?: number;
  limitMonth?: number;
  isActive: boolean;
}

export default function AiModelConfigPage() {
  const { data, isLoading, isError, error, refetch } = useModelConfigs();
  const { data: catalog } = useModelCatalog();
  const update = useUpdateModelConfig();

  const [editing, setEditing] = useState<ModelConfig | null>(null);
  const [form] = Form.useForm<EditFormValues>();

  const catalogItems = catalog?.models ?? [];
  const catalogById = useMemo(() => {
    const map = new Map<string, ModelCatalogItem>();
    catalogItems.forEach((m) => map.set(m.id, m));
    return map;
  }, [catalogItems]);

  const modelOptions = useMemo(
    () =>
      catalogItems.map((m) => ({
        value: m.id,
        label: `${m.label} (${m.provider})`,
      })),
    [catalogItems]
  );

  useEffect(() => {
    if (editing) {
      form.setFieldsValue({
        model: editing.modelName,
        fallbackModel: editing.fallbackModelName ?? undefined,
        limitDay: editing.params?.limits?.DAY,
        limitMonth: editing.params?.limits?.MONTH,
        isActive: editing.isActive,
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
      title: "Trạng thái",
      dataIndex: "isActive",
      render: (isActive: boolean) =>
        isActive ? <Tag color="green">Bật</Tag> : <Tag>Tắt</Tag>,
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
        },
      },
      {
        onSuccess: () => {
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
          <Form.Item label="Kích hoạt" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
