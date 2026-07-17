import { useEffect, useState } from "react";
import { Alert, Form, Input, InputNumber, Modal, Switch, message } from "antd";
import { useUpsertXpRule } from "../api/gamification.api";
import type { XpRule, XpRuleUpsertRequest } from "../api/gamification.api";

interface XpRuleFormModalProps {
  open: boolean;
  rule?: XpRule | null;
  onClose: () => void;
}

/**
 * Modal tạo/sửa XP rule. Upsert theo `ruleKey` (POST /gamification/admin/xp-rules) — khi sửa,
 * ruleKey khoá lại (đổi key = tạo rule mới). BE không có delete: retire rule = active:false.
 * `dailyCap` để trống = không giới hạn/ngày (gửi null).
 */
export function XpRuleFormModal({ open, rule, onClose }: XpRuleFormModalProps) {
  const upsert = useUpsertXpRule();
  const [form] = Form.useForm<XpRuleUpsertRequest>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = !!rule;

  useEffect(() => {
    if (!open) return;
    if (rule) {
      form.setFieldsValue({
        ruleKey: rule.ruleKey,
        amount: rule.amount,
        dailyCap: rule.dailyCap,
        reputationAmount: rule.reputationAmount,
        active: rule.active,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        amount: 1,
        dailyCap: null,
        reputationAmount: 0,
        active: true,
      });
    }
    setSubmitError(null);
  }, [open, rule, form]);

  function handleSubmit() {
    setSubmitError(null);
    form.validateFields().then((values) => {
      const payload: XpRuleUpsertRequest = {
        ruleKey: values.ruleKey.trim(),
        amount: values.amount,
        // dailyCap trống (null/undefined) → không giới hạn/ngày.
        dailyCap:
          values.dailyCap === null || values.dailyCap === undefined
            ? null
            : values.dailyCap,
        reputationAmount: values.reputationAmount,
        active: values.active,
      };
      upsert.mutate(payload, {
        onSuccess: () => {
          message.success(isEdit ? "Đã cập nhật XP rule" : "Đã tạo XP rule");
          onClose();
        },
        // handleAdminMutationError đã hiện notification (map GAMIFICATION_INVALID_CONFIG);
        // thêm dòng lỗi trong modal để admin thấy ngay tại chỗ.
        onError: (err) => setSubmitError(err.message),
      });
    });
  }

  return (
    <Modal
      open={open}
      title={isEdit ? `Sửa XP rule ${rule?.ruleKey}` : "Thêm XP rule"}
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
          name="ruleKey"
          label="Khoá rule (ruleKey)"
          rules={[{ required: true, message: "Bắt buộc" }]}
          extra="Upsert theo khoá — trùng khoá sẽ ghi đè rule hiện có."
        >
          <Input placeholder="VD: community.comment.created" disabled={isEdit} />
        </Form.Item>
        <Form.Item
          name="amount"
          label="Điểm XP (amount)"
          rules={[{ required: true, message: "Bắt buộc" }]}
          extra="Số XP cộng mỗi lần khớp rule."
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="dailyCap"
          label="Giới hạn XP/ngày (dailyCap)"
          extra="Để trống = không giới hạn theo ngày."
        >
          <InputNumber min={0} style={{ width: "100%" }} placeholder="Không giới hạn" />
        </Form.Item>
        <Form.Item
          name="reputationAmount"
          label="Điểm uy tín (reputationAmount)"
          rules={[{ required: true, message: "Bắt buộc" }]}
          extra="Reputation cộng kèm mỗi lần khớp (0 nếu không dùng)."
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
