import { useEffect, useState } from "react";
import { Alert, DatePicker, Form, Input, InputNumber, Modal, message } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import type { CreateTermRequest, TermView, UpdateTermRequest } from "../../types";
import { useCreateTerm, useUpdateTerm } from "../api/terms.api";

const { RangePicker } = DatePicker;

interface TermFormModalProps {
  open: boolean;
  /** null → tạo mới; TermView → sửa (code khoá cứng vì immutable). */
  term: TermView | null;
  onClose: () => void;
}

interface TermFormValues {
  code: string;
  name: string;
  range: [Dayjs, Dayjs];
  reminderLeadDays: number;
}

const DEFAULT_REMINDER_LEAD_DAYS = 7;

/**
 * Modal tạo/sửa kỳ học. `startsAt`/`endsAt` là Instant BE → gửi ISO (`.toISOString()`), hydrate
 * `dayjs(iso)`. `code` immutable: disabled + KHÔNG gửi trong `UpdateTermRequest`. Tự quản mutation
 * (giống SeasonFormModal) — success toast + đóng; lỗi BE đã có notification (handleAdminMutationError),
 * kèm dòng Alert trong modal để giữ modal mở.
 */
export function TermFormModal({ open, term, onClose }: TermFormModalProps) {
  const isEdit = Boolean(term);
  const create = useCreateTerm();
  const update = useUpdateTerm(term?.id);
  const [form] = Form.useForm<TermFormValues>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    if (term) {
      form.setFieldsValue({
        code: term.code,
        name: term.name,
        range: [dayjs(term.startsAt), dayjs(term.endsAt)],
        reminderLeadDays: term.reminderLeadDays,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ reminderLeadDays: DEFAULT_REMINDER_LEAD_DAYS });
    }
  }, [open, term, form]);

  function handleSubmit() {
    setSubmitError(null);
    form.validateFields().then((values) => {
      const [start, end] = values.range;
      if (isEdit && term) {
        const payload: UpdateTermRequest = {
          name: values.name.trim(),
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          reminderLeadDays: values.reminderLeadDays,
        };
        update.mutate(payload, {
          onSuccess: () => {
            message.success("Đã cập nhật kỳ học");
            onClose();
          },
          onError: (err) => setSubmitError(err.message),
        });
      } else {
        const payload: CreateTermRequest = {
          code: values.code.trim(),
          name: values.name.trim(),
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          reminderLeadDays: values.reminderLeadDays,
        };
        create.mutate(payload, {
          onSuccess: () => {
            message.success("Đã tạo kỳ học");
            onClose();
          },
          onError: (err) => setSubmitError(err.message),
        });
      }
    });
  }

  return (
    <Modal
      open={open}
      title={isEdit ? "Sửa kỳ học" : "Tạo kỳ học"}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={create.isPending || update.isPending}
      okText={isEdit ? "Lưu" : "Tạo"}
      cancelText="Huỷ"
      destroyOnClose
      width={560}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="code"
          label="Mã kỳ (code)"
          rules={[
            { required: true, message: "Bắt buộc" },
            { max: 64, message: "Tối đa 64 ký tự" },
          ]}
          extra={
            isEdit
              ? "Mã kỳ không thể đổi sau khi tạo."
              : "VD: 2026-HK1. Mã dùng để nhận diện kỳ, không đổi được về sau."
          }
        >
          <Input placeholder="VD: 2026-HK1" disabled={isEdit} />
        </Form.Item>
        <Form.Item
          name="name"
          label="Tên kỳ"
          rules={[
            { required: true, message: "Bắt buộc" },
            { max: 255, message: "Tối đa 255 ký tự" },
          ]}
        >
          <Input placeholder="VD: Học kỳ 1 năm 2026" />
        </Form.Item>
        <Form.Item
          name="range"
          label="Thời gian (bắt đầu — kết thúc)"
          rules={[{ required: true, message: "Bắt buộc" }]}
        >
          <RangePicker showTime style={{ width: "100%" }} format="DD/MM/YYYY HH:mm" />
        </Form.Item>
        <Form.Item
          name="reminderLeadDays"
          label="Số ngày nhắc trước khi kết thúc"
          rules={[{ required: true, message: "Bắt buộc" }]}
          extra="Số ngày trước thời điểm kết thúc để gửi nhắc học viên. Mặc định 7."
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        {submitError && (
          <Alert type="error" showIcon message={submitError} style={{ marginTop: 8 }} />
        )}
      </Form>
    </Modal>
  );
}
