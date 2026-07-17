import { useEffect, useState } from "react";
import { Alert, Form, Input, InputNumber, Modal, Switch, message } from "antd";
import { useUpsertRewardPool } from "../api/gamification.api";
import type { RewardPool, RewardPoolUpsertRequest } from "../api/gamification.api";

interface RewardPoolFormModalProps {
  open: boolean;
  pool?: RewardPool | null;
  onClose: () => void;
}

/**
 * Modal tạo/sửa reward pool. Upsert theo `code` (POST /gamification/admin/reward-pools) — khi sửa,
 * code khoá lại (đổi code = tạo pool mới). `type` là loại phần thưởng (VD DAILY_BOX), `costType`/
 * `costAmount` là chi phí mở pool (VD COIN / 100). Không có delete ở BE — retire = active:false.
 */
export function RewardPoolFormModal({ open, pool, onClose }: RewardPoolFormModalProps) {
  const upsert = useUpsertRewardPool();
  const [form] = Form.useForm<RewardPoolUpsertRequest>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = !!pool;

  useEffect(() => {
    if (!open) return;
    if (pool) {
      form.setFieldsValue({
        code: pool.code,
        type: pool.type,
        costType: pool.costType,
        costAmount: pool.costAmount,
        active: pool.active,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        type: "DAILY_BOX",
        costType: "COIN",
        costAmount: 0,
        active: true,
      });
    }
    setSubmitError(null);
  }, [open, pool, form]);

  function handleSubmit() {
    setSubmitError(null);
    form.validateFields().then((values) => {
      const payload: RewardPoolUpsertRequest = {
        code: values.code.trim(),
        type: values.type.trim(),
        costType: values.costType.trim(),
        costAmount: values.costAmount,
        active: values.active,
      };
      upsert.mutate(payload, {
        onSuccess: () => {
          message.success(isEdit ? "Đã cập nhật reward pool" : "Đã tạo reward pool");
          onClose();
        },
        // handleAdminMutationError đã hiện notification lỗi BE; thêm dòng lỗi trong modal.
        onError: (err) => setSubmitError(err.message),
      });
    });
  }

  return (
    <Modal
      open={open}
      title={isEdit ? `Sửa reward pool ${pool?.code}` : "Thêm reward pool"}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={upsert.isPending}
      okText="Lưu"
      cancelText="Huỷ"
      destroyOnClose
      width={520}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="code"
          label="Mã pool (code)"
          rules={[{ required: true, message: "Bắt buộc" }]}
          extra="Upsert theo mã — trùng mã sẽ ghi đè pool hiện có."
        >
          <Input placeholder="VD: DAILY_BOX" disabled={isEdit} />
        </Form.Item>
        <Form.Item
          name="type"
          label="Loại pool (type)"
          rules={[{ required: true, message: "Bắt buộc" }]}
          extra="Phân loại pool phần thưởng (VD DAILY_BOX, EVENT)."
        >
          <Input placeholder="VD: DAILY_BOX" />
        </Form.Item>
        <Form.Item
          name="costType"
          label="Loại chi phí (costType)"
          rules={[{ required: true, message: "Bắt buộc" }]}
          extra="Đơn vị chi phí để mở pool (VD COIN)."
        >
          <Input placeholder="VD: COIN" />
        </Form.Item>
        <Form.Item
          name="costAmount"
          label="Chi phí mở (costAmount)"
          rules={[{ required: true, message: "Bắt buộc" }]}
          extra="Số xu/đơn vị cần trả để quay pool (0 nếu miễn phí)."
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="active" label="Đang hoạt động" valuePropName="checked">
          <Switch />
        </Form.Item>
        {submitError && (
          <Alert type="error" showIcon message={submitError} style={{ marginTop: 8 }} />
        )}
      </Form>
    </Modal>
  );
}
