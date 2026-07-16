import { useEffect, useState } from "react";
import { Alert, DatePicker, Form, Input, Modal, message } from "antd";
import type { Dayjs } from "dayjs";
import { useCreateSeason } from "../api/gamification.api";
import type { SeasonCreateRequest } from "../api/gamification.api";

const { RangePicker } = DatePicker;

interface SeasonFormModalProps {
  open: boolean;
  onClose: () => void;
}

interface SeasonFormValues {
  code: string;
  range: [Dayjs, Dayjs];
}

/**
 * Modal tạo season mới. `startsAt`/`endsAt` là Instant ở BE → gửi ISO-8601 (`.toISOString()`).
 * Không sửa season đã tạo ở đây (read tối thiểu) — vòng đời season đóng qua nút "Đóng season".
 */
export function SeasonFormModal({ open, onClose }: SeasonFormModalProps) {
  const create = useCreateSeason();
  const [form] = Form.useForm<SeasonFormValues>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setSubmitError(null);
  }, [open, form]);

  function handleSubmit() {
    setSubmitError(null);
    form.validateFields().then((values) => {
      const [start, end] = values.range;
      const payload: SeasonCreateRequest = {
        code: values.code.trim(),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
      };
      create.mutate(payload, {
        onSuccess: () => {
          message.success("Đã tạo season");
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
      title="Tạo season"
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={create.isPending}
      okText="Tạo"
      cancelText="Huỷ"
      destroyOnClose
      width={520}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="code"
          label="Mã season (code)"
          rules={[{ required: true, message: "Bắt buộc" }]}
          extra="VD: 2026-S1. Mã dùng để nhận diện season trên bảng xếp hạng."
        >
          <Input placeholder="VD: 2026-S1" />
        </Form.Item>
        <Form.Item
          name="range"
          label="Thời gian (bắt đầu — kết thúc)"
          rules={[{ required: true, message: "Bắt buộc" }]}
        >
          <RangePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        {submitError && (
          <Alert type="error" showIcon message={submitError} style={{ marginTop: 8 }} />
        )}
      </Form>
    </Modal>
  );
}
