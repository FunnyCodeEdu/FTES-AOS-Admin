import { useEffect, useMemo, useState } from "react";
import { AutoComplete, Alert, Form, Input, InputNumber, Modal, Switch, message } from "antd";
import { useUpsertQuest } from "../api/gamification.api";
import type { Quest, QuestUpsertRequest } from "../api/gamification.api";

interface QuestFormModalProps {
  open: boolean;
  quest?: Quest | null;
  onClose: () => void;
}

/** Kinh tế xu: nhiệm vụ nên thưởng 50–100 xu (1000 xu = 1000đ). Ngoài khoảng chỉ cảnh báo, không chặn. */
const COIN_MIN = 50;
const COIN_MAX = 100;

/** Gợi ý các trigger event phổ biến (input tự do — BE nhận mọi chuỗi trừ khi đã có handler). */
const TRIGGER_HINTS = [
  "COMMUNITY_COMMENT",
  "COMMUNITY_POST",
  "LESSON_COMPLETED",
  "COURSE_COMPLETED",
  "QUIZ_PASSED",
  "DAILY_LOGIN",
  "STREAK_KEPT",
].map((v) => ({ value: v }));

export function QuestFormModal({ open, quest, onClose }: QuestFormModalProps) {
  const upsert = useUpsertQuest();
  const [form] = Form.useForm<QuestUpsertRequest>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = !!quest;

  // Theo dõi rewardCoin để hiện cảnh báo kinh tế ngoài 50–100.
  const rewardCoin = Form.useWatch("rewardCoin", form);
  const coinWarning = useMemo(
    () =>
      typeof rewardCoin === "number" && (rewardCoin < COIN_MIN || rewardCoin > COIN_MAX),
    [rewardCoin]
  );

  useEffect(() => {
    if (!open) return;
    if (quest) {
      form.setFieldsValue({
        code: quest.code,
        title: quest.title,
        description: quest.description ?? "",
        rewardCoin: quest.rewardCoin,
        targetCount: quest.targetCount,
        dailyLimit: quest.dailyLimit,
        triggerEventType: quest.triggerEventType,
        conditionJson: quest.conditionJson ?? "",
        active: quest.active,
        sortOrder: quest.sortOrder,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        active: true,
        rewardCoin: COIN_MIN,
        targetCount: 1,
        dailyLimit: 1,
        sortOrder: 0,
      });
    }
    setSubmitError(null);
  }, [open, quest, form]);

  function handleSubmit() {
    setSubmitError(null);
    form.validateFields().then((values) => {
      const conditionRaw = (values.conditionJson ?? "").toString().trim();
      const payload: QuestUpsertRequest = {
        code: values.code.trim(),
        title: values.title.trim(),
        description: values.description?.toString().trim() || null,
        rewardCoin: values.rewardCoin,
        targetCount: values.targetCount,
        dailyLimit: values.dailyLimit,
        triggerEventType: values.triggerEventType.trim(),
        conditionJson: conditionRaw === "" ? null : conditionRaw,
        active: values.active,
        sortOrder: values.sortOrder,
      };
      upsert.mutate(payload, {
        onSuccess: () => {
          message.success(isEdit ? "Đã cập nhật nhiệm vụ" : "Đã tạo nhiệm vụ");
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
      title={isEdit ? `Sửa nhiệm vụ ${quest?.code}` : "Thêm nhiệm vụ"}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={upsert.isPending}
      okText="Lưu"
      cancelText="Huỷ"
      destroyOnClose
      width={560}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="code"
          label="Mã nhiệm vụ (code)"
          rules={[{ required: true, message: "Bắt buộc" }]}
          extra="Upsert theo mã — trùng mã sẽ ghi đè nhiệm vụ hiện có."
        >
          <Input placeholder="VD: COMMUNITY_COMMENT" disabled={isEdit} />
        </Form.Item>
        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: "Bắt buộc" }]}>
          <Input placeholder="VD: Bình luận cộng đồng" />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={2} placeholder="Mô tả ngắn cho người học" />
        </Form.Item>
        <Form.Item
          name="triggerEventType"
          label="Trigger event"
          rules={[{ required: true, message: "Bắt buộc" }]}
          extra="Loại sự kiện kích hoạt tiến độ nhiệm vụ."
        >
          <AutoComplete
            options={TRIGGER_HINTS}
            placeholder="VD: COMMUNITY_COMMENT"
            filterOption={(input, option) =>
              (option?.value ?? "").toUpperCase().includes(input.toUpperCase())
            }
          />
        </Form.Item>
        <Form.Item
          name="rewardCoin"
          label="Thưởng xu (rewardCoin)"
          rules={[{ required: true, message: "Bắt buộc" }]}
          validateStatus={coinWarning ? "warning" : undefined}
          help={
            coinWarning
              ? `Nên trong khoảng ${COIN_MIN}–${COIN_MAX} xu theo hướng dẫn kinh tế (vẫn lưu được).`
              : undefined
          }
        >
          <InputNumber min={1} max={1000} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="targetCount"
          label="Số lần cần đạt (targetCount)"
          rules={[{ required: true, message: "Bắt buộc" }]}
        >
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="dailyLimit"
          label="Giới hạn/ngày (dailyLimit)"
          rules={[{ required: true, message: "Bắt buộc" }]}
        >
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="sortOrder" label="Thứ tự sắp xếp (sortOrder)" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="conditionJson"
          label="Điều kiện (conditionJson)"
          extra='JSON hợp lệ hoặc để trống. VD: {"minLength": 20}'
          rules={[
            {
              validator: (_, value) => {
                const raw = (value ?? "").toString().trim();
                if (raw === "") return Promise.resolve();
                try {
                  JSON.parse(raw);
                  return Promise.resolve();
                } catch {
                  return Promise.reject(new Error("JSON không hợp lệ"));
                }
              },
            },
          ]}
        >
          <Input.TextArea rows={3} placeholder='{"minLength": 20}' />
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
