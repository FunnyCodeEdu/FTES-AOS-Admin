import { useEffect, useState } from "react";
import {
  Button,
  Descriptions,
  Divider,
  Drawer,
  Form,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import { Can } from "../../../shared/permissions";
import {
  useAddDeduction,
  useDeleteDeduction,
  usePayrollDetail,
  useUpdateAllowance,
  useUpdateDeduction,
  useUpdateStatus,
} from "../api/payroll.api";
import type { DeductionInput, Earning, EarningStatus, PayrollDeduction } from "../types";
import { STATUS_LABEL, formatDate, formatVnd, statusOptionsFor, statusTagColor } from "../format";
import { DeductionModal } from "./DeductionModal";

interface PayrollDetailDrawerProps {
  open: boolean;
  earning: Earning | null;
  onClose: () => void;
}

export function PayrollDetailDrawer({ open, earning, onClose }: PayrollDetailDrawerProps) {
  const id = earning?.id;
  const { data: detail } = usePayrollDetail(open ? id : undefined);
  // detail (fresh) ưu tiên; earning (dòng từ list) làm giá trị tạm khi detail đang tải.
  const current = detail ?? earning;
  const isOpenBatch = current?.status === "OPEN";

  const [allowanceForm] = Form.useForm<{ allowance: number }>();
  const [deductionModalOpen, setDeductionModalOpen] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<PayrollDeduction | null>(null);

  const updateAllowance = useUpdateAllowance(id);
  const addDeduction = useAddDeduction(id);
  const updateDeduction = useUpdateDeduction(id);
  const deleteDeduction = useDeleteDeduction(id);
  const updateStatus = useUpdateStatus(id);

  useEffect(() => {
    if (current) allowanceForm.setFieldsValue({ allowance: current.allowance });
  }, [current, allowanceForm]);

  const handleAllowanceSubmit = (values: { allowance: number }) => {
    updateAllowance.mutate(values, {
      onSuccess: () => message.success("Đã cập nhật phụ cấp"),
    });
  };

  const handleDeductionSubmit = (values: DeductionInput) => {
    const onDone = (label: string) => () => {
      message.success(label);
      setDeductionModalOpen(false);
      setEditingDeduction(null);
    };
    if (editingDeduction) {
      updateDeduction.mutate(
        { deductionId: editingDeduction.id, body: values },
        { onSuccess: onDone("Đã cập nhật khoản trừ") }
      );
    } else {
      addDeduction.mutate(values, { onSuccess: onDone("Đã thêm khoản trừ") });
    }
  };

  const handleStatusChange = (status: EarningStatus) => {
    if (!current || status === current.status) return;
    const commit = () =>
      updateStatus.mutate(
        { status },
        { onSuccess: () => message.success(`Đã chuyển trạng thái sang ${status}`) }
      );
    // Mark-paid (PENDING → CLOSE): ghi nhận đã chi trả, không hoàn tác → xác nhận nguy hiểm.
    if (status === "CLOSE") {
      Modal.confirm({
        title: "Xác nhận chốt kỳ lương (đã chi trả)?",
        content:
          "Chuyển sang CLOSE sẽ ghi nhận kỳ lương đã được chi trả và KHÔNG thể hoàn tác. Bạn chắc chắn?",
        okText: "Chốt & đánh dấu đã trả",
        okType: "danger",
        cancelText: "Huỷ",
        onOk: commit,
      });
      return;
    }
    commit();
  };

  const deductionColumns: ColumnsType<PayrollDeduction> = [
    { title: "Loại", dataIndex: "type", key: "type" },
    { title: "Mô tả", dataIndex: "description", key: "description", render: (v) => v || "—" },
    {
      title: "Số tiền",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (value: number) => formatVnd(value),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 120,
      render: (_, record) => (
        <Can permissions={["payroll.manage"]}>
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={!isOpenBatch}
              onClick={() => {
                setEditingDeduction(record);
                setDeductionModalOpen(true);
              }}
            />
            <Popconfirm
              title="Xoá khoản trừ này?"
              okText="Xoá"
              okButtonProps={{ danger: true }}
              cancelText="Huỷ"
              disabled={!isOpenBatch}
              onConfirm={() =>
                deleteDeduction.mutate(
                  { deductionId: record.id },
                  { onSuccess: () => message.success("Đã xoá khoản trừ") }
                )
              }
            >
              <Button size="small" danger icon={<DeleteOutlined />} disabled={!isOpenBatch} />
            </Popconfirm>
          </Space>
        </Can>
      ),
    },
  ];

  return (
    <Drawer
      title={current ? `Chi tiết lương — ${current.instructorName}` : "Chi tiết lương"}
      width={720}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      {current && (
        <>
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Giảng viên" span={2}>
              {current.instructorName}
            </Descriptions.Item>
            <Descriptions.Item label="Doanh thu gộp">
              {formatVnd(current.grossRevenue)}
            </Descriptions.Item>
            <Descriptions.Item label="Phụ cấp">{formatVnd(current.allowance)}</Descriptions.Item>
            <Descriptions.Item label="Tổng trừ">
              {formatVnd(current.totalDeduction)}
            </Descriptions.Item>
            <Descriptions.Item label="Thực nhận">
              <strong>{formatVnd(current.netPayable)}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={statusTagColor(current.status)}>{STATUS_LABEL[current.status]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Hiệu lực">
              {current.active ? "Có" : "Không"}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">{formatDate(current.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Ngày trả">{formatDate(current.paidAt)}</Descriptions.Item>
          </Descriptions>

          <Can permissions={["payroll.manage"]}>
            <>
              <Divider orientation="left">Phụ cấp</Divider>
              <Form
                form={allowanceForm}
                layout="inline"
                onFinish={handleAllowanceSubmit}
                initialValues={{ allowance: current.allowance }}
              >
                <Form.Item
                  name="allowance"
                  rules={[{ required: true, message: "Vui lòng nhập phụ cấp" }]}
                >
                  <InputNumber<number>
                    style={{ width: 220 }}
                    min={0}
                    disabled={!isOpenBatch}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    parser={(value) => Number((value ?? "").replace(/,/g, ""))}
                  />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    disabled={!isOpenBatch}
                    loading={updateAllowance.isPending}
                  >
                    Cập nhật phụ cấp
                  </Button>
                </Form.Item>
              </Form>
              {!isOpenBatch && (
                <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                  Chỉ chỉnh sửa được khi kỳ lương đang mở (OPEN).
                </Typography.Text>
              )}

              <Divider orientation="left">Đổi trạng thái</Divider>
              <Space>
                <Select
                  value={current.status}
                  style={{ width: 200 }}
                  options={statusOptionsFor(current.status)}
                  loading={updateStatus.isPending}
                  onChange={handleStatusChange}
                />
              </Space>
            </>
          </Can>

          <Divider orientation="left">
            <Space>
              Khoản trừ
              <Can permissions={["payroll.manage"]}>
                <Button
                  size="small"
                  type="primary"
                  icon={<PlusOutlined />}
                  disabled={!isOpenBatch}
                  onClick={() => {
                    setEditingDeduction(null);
                    setDeductionModalOpen(true);
                  }}
                >
                  Thêm khoản trừ
                </Button>
              </Can>
            </Space>
          </Divider>
          <Table
            rowKey="id"
            size="small"
            columns={deductionColumns}
            dataSource={current.deductions ?? []}
            pagination={false}
            locale={{ emptyText: "Chưa có khoản trừ" }}
          />

          <DeductionModal
            open={deductionModalOpen}
            editing={editingDeduction}
            submitting={addDeduction.isPending || updateDeduction.isPending}
            onCancel={() => {
              setDeductionModalOpen(false);
              setEditingDeduction(null);
            }}
            onSubmit={handleDeductionSubmit}
          />
        </>
      )}
    </Drawer>
  );
}
