import { useState } from "react";
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { CheckCircleOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Can } from "../../../shared/permissions";
import {
  useAddRewardPoolItem,
  useDeleteRewardPoolItem,
  useRewardPoolItems,
  useValidateRewardPool,
} from "../api/gamification.api";
import type { RewardItem, RewardItemRequest, RewardPool } from "../api/gamification.api";

interface RewardPoolItemsDrawerProps {
  pool: RewardPool | null;
  onClose: () => void;
}

/**
 * Drawer quản lý item của 1 reward pool: liệt kê item, thêm item, xoá (confirm) và kiểm tra tổng
 * xác suất = 1.0. BE saveAndFlush rồi validate tổng probability — nếu tổng ≠ 1.0 khi thêm ⇒ BE
 * rollback + GAMIFICATION_INVALID_CONFIG (notification qua handleAdminMutationError). Nút "Kiểm tra
 * tổng xác suất" gọi endpoint validate: PASS (true) → hiện xanh; FAIL → BE ném lỗi (notification).
 */
export function RewardPoolItemsDrawer({ pool, onClose }: RewardPoolItemsDrawerProps) {
  const poolId = pool?.id;
  const { data, isLoading, isError, error, refetch } = useRewardPoolItems(poolId);
  const addItem = useAddRewardPoolItem(poolId ?? "");
  const deleteItem = useDeleteRewardPoolItem(poolId ?? "");
  const validate = useValidateRewardPool();
  const [form] = Form.useForm<RewardItemRequest>();
  const [validateOk, setValidateOk] = useState<boolean | null>(null);

  const totalProbability = (data ?? []).reduce((sum, it) => sum + (it.probability ?? 0), 0);

  function handleAdd() {
    form.validateFields().then((values) => {
      const payload: RewardItemRequest = {
        rewardType: values.rewardType.trim(),
        amount: values.amount,
        badgeId: values.badgeId?.trim() ? values.badgeId.trim() : null,
        probability: values.probability,
        stock: values.stock === null || values.stock === undefined ? null : values.stock,
      };
      addItem.mutate(payload, {
        onSuccess: () => {
          message.success("Đã thêm item");
          form.resetFields();
          setValidateOk(null);
        },
        // handleAdminMutationError đã hiện notification (tổng probability ≠ 1.0 ⇒ rollback).
      });
    });
  }

  function handleDelete(item: RewardItem) {
    Modal.confirm({
      title: "Xoá item khỏi pool?",
      content:
        "Xoá item này khỏi pool. Sau khi xoá, tổng xác suất có thể ≠ 1.0 — hãy kiểm tra lại trước khi cho người dùng quay.",
      okText: "Xoá",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: () =>
        deleteItem.mutate(item.id, {
          onSuccess: () => {
            message.success("Đã xoá item");
            setValidateOk(null);
          },
        }),
    });
  }

  function handleValidate() {
    if (!poolId) return;
    setValidateOk(null);
    validate.mutate(poolId, {
      onSuccess: (ok) => {
        setValidateOk(ok);
        if (ok) message.success("Tổng xác suất hợp lệ (= 1.0)");
      },
      // FAIL (tổng ≠ 1.0) ⇒ BE ném GAMIFICATION_INVALID_CONFIG → notification qua onError chung.
    });
  }

  const columns: TableProps<RewardItem>["columns"] = [
    { title: "Loại thưởng", dataIndex: "rewardType", width: 150 },
    { title: "Số lượng", dataIndex: "amount", width: 100 },
    {
      title: "Badge",
      dataIndex: "badgeId",
      width: 160,
      render: (v: string | null) => v ?? <Tag>—</Tag>,
    },
    {
      title: "Xác suất",
      dataIndex: "probability",
      width: 110,
      render: (v: number) => v?.toFixed?.(4) ?? v,
    },
    {
      title: "Kho",
      dataIndex: "stock",
      width: 90,
      render: (v: number | null) => (v === null || v === undefined ? <Tag>∞</Tag> : v),
    },
    {
      title: "Thao tác",
      fixed: "right",
      width: 90,
      render: (_: unknown, record: RewardItem) => (
        <Can permissions={["gamification.admin.manage"]}>
          <Button size="small" danger onClick={() => handleDelete(record)}>
            Xoá
          </Button>
        </Can>
      ),
    },
  ];

  return (
    <Drawer
      open={!!pool}
      title={pool ? `Item của pool ${pool.code}` : "Item"}
      width={720}
      onClose={onClose}
      destroyOnClose
    >
      <Space style={{ marginBottom: 12 }} wrap>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
          Làm mới
        </Button>
        <Can permissions={["gamification.admin.manage"]}>
          <Button
            icon={<CheckCircleOutlined />}
            loading={validate.isPending}
            onClick={handleValidate}
          >
            Kiểm tra tổng xác suất
          </Button>
        </Can>
        <Typography.Text type="secondary">
          Tổng xác suất hiện tại: <b>{totalProbability.toFixed(4)}</b> (cần = 1.0)
        </Typography.Text>
      </Space>

      {validateOk === true && (
        <Alert
          type="success"
          showIcon
          message="Tổng xác suất hợp lệ — pool sẵn sàng cho người dùng quay."
          style={{ marginBottom: 12 }}
        />
      )}

      {isError && (
        <Alert
          type="error"
          message="Không thể tải item của pool"
          description={error?.message}
          action={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>Thử lại</Button>}
          style={{ marginBottom: 12 }}
        />
      )}

      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={data ?? []}
        loading={isLoading}
        pagination={false}
        scroll={{ x: 700 }}
      />

      <Can permissions={["gamification.admin.manage"]}>
        <Typography.Title level={5} style={{ marginTop: 20 }}>
          Thêm item
        </Typography.Title>
        <Form form={form} layout="vertical">
          <Space align="start" wrap>
            <Form.Item
              name="rewardType"
              label="Loại thưởng"
              rules={[{ required: true, message: "Bắt buộc" }]}
            >
              <Input placeholder="VD: COIN" style={{ width: 140 }} />
            </Form.Item>
            <Form.Item
              name="amount"
              label="Số lượng"
              rules={[{ required: true, message: "Bắt buộc" }]}
              initialValue={0}
            >
              <InputNumber min={0} style={{ width: 110 }} />
            </Form.Item>
            <Form.Item name="badgeId" label="Badge (tuỳ chọn)">
              <Input placeholder="badgeId" style={{ width: 160 }} />
            </Form.Item>
            <Form.Item
              name="probability"
              label="Xác suất (0–1)"
              rules={[{ required: true, message: "Bắt buộc" }]}
              initialValue={0}
            >
              <InputNumber min={0} max={1} step={0.01} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="stock" label="Kho (trống=∞)">
              <InputNumber min={0} style={{ width: 120 }} placeholder="∞" />
            </Form.Item>
            <Form.Item label=" ">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                loading={addItem.isPending}
                onClick={handleAdd}
              >
                Thêm
              </Button>
            </Form.Item>
          </Space>
        </Form>
        <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
          Lưu ý: BE kiểm tra tổng xác suất sau khi thêm — nếu tổng ≠ 1.0 sẽ bị từ chối và item không
          được lưu.
        </Typography.Paragraph>
      </Can>
    </Drawer>
  );
}
