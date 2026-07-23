import { useEffect } from "react";
import { Form, Input, Modal, message } from "antd";
import { useCreateQuestionBank } from "../api/questionBank.api";
import type { CreateBankInput, QuestionBankView } from "../types";

interface CreateBankModalProps {
  open: boolean;
  onClose: () => void;
  /** Gọi sau khi tạo thành công (vd điều hướng sang kho mới). */
  onCreated?: (bank: QuestionBankView) => void;
}

/** Modal tạo kho `{title, description?}` (mirror `ResourceFormModal`/`DeductionModal`). */
export function CreateBankModal({ open, onClose, onCreated }: CreateBankModalProps) {
  const [form] = Form.useForm<CreateBankInput>();
  const createBank = useCreateQuestionBank();

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  const handleSubmit = (values: CreateBankInput) => {
    createBank.mutate(values, {
      onSuccess: (bank) => {
        message.success("Đã tạo kho câu hỏi");
        onClose();
        onCreated?.(bank);
      },
    });
  };

  return (
    <Modal
      title="Tạo kho câu hỏi"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={createBank.isPending}
      okText="Tạo"
      cancelText="Huỷ"
      destroyOnClose
      width={520}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="title"
          label="Tên kho"
          rules={[{ required: true, message: "Vui lòng nhập tên kho" }]}
        >
          <Input placeholder="Ví dụ: Đề Toán 12 — chương Tổ hợp" maxLength={200} />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea placeholder="Mô tả ngắn (tuỳ chọn)" rows={3} maxLength={1000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
