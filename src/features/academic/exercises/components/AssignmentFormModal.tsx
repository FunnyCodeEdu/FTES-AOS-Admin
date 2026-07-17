import { useEffect } from "react";
import {
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  message,
} from "antd";
import { useCreateAssignment } from "../api/exercises.api";

interface AssignmentFormModalProps {
  lessonId: string;
  open: boolean;
  nextSortOrder: number;
  disabled?: boolean;
  onClose: () => void;
}

interface AssignmentForm {
  title: string;
  question: string;
  criteria?: string;
  expectedOutput?: string;
  fileExtension?: string;
  maxSubmissions?: number;
  free: boolean;
  checkLogic: boolean;
  checkPerform: boolean;
  checkEdgeCase: boolean;
  testCases?: string;
}

export function AssignmentFormModal({
  lessonId,
  open,
  nextSortOrder,
  disabled,
  onClose,
}: AssignmentFormModalProps) {
  const [form] = Form.useForm<AssignmentForm>();
  const createAssignment = useCreateAssignment(lessonId);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        title: "",
        question: "",
        criteria: "",
        expectedOutput: "",
        fileExtension: "",
        maxSubmissions: 1,
        free: false,
        checkLogic: true,
        checkPerform: false,
        checkEdgeCase: false,
        testCases: "",
      });
    }
  }, [open, form]);

  const handleSubmit = (values: AssignmentForm) => {
    createAssignment.mutate(
      {
        title: values.title,
        question: values.question,
        criteria: values.criteria || undefined,
        expectedOutput: values.expectedOutput || undefined,
        fileExtension: values.fileExtension || undefined,
        maxSubmissions: values.maxSubmissions ?? undefined,
        free: values.free,
        checkLogic: values.checkLogic,
        checkPerform: values.checkPerform,
        checkEdgeCase: values.checkEdgeCase,
        testCases: values.testCases || undefined,
        sortOrder: nextSortOrder,
      },
      {
        onSuccess: () => {
          message.success("Đã tạo assignment");
          onClose();
        },
      }
    );
  };

  return (
    <Modal
      title="Tạo assignment (nộp bài qua GitHub)"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Tạo"
      confirmLoading={createAssignment.isPending}
      okButtonProps={{ disabled }}
      width={720}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={disabled}>
        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: "Nhập tiêu đề" }]}>
          <Input placeholder="VD: Bài tập cấu trúc dữ liệu" />
        </Form.Item>
        <Form.Item name="question" label="Đề bài" rules={[{ required: true, message: "Nhập đề bài" }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item name="criteria" label="Tiêu chí chấm">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="expectedOutput" label="Kết quả mong đợi (tuỳ chọn)">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Space size="large" wrap>
          <Form.Item name="fileExtension" label="Định dạng file (VD: .py, .java)">
            <Input placeholder=".py" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item
            name="maxSubmissions"
            label="Số lần nộp tối đa"
            rules={[{ type: "number", min: 0, message: "Phải >= 0" }]}
          >
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item name="free" label="Miễn phí" valuePropName="checked">
            <Checkbox />
          </Form.Item>
        </Space>
        <Form.Item label="Tiêu chí AI chấm">
          <Space wrap>
            <Form.Item name="checkLogic" valuePropName="checked" noStyle>
              <Checkbox>Logic</Checkbox>
            </Form.Item>
            <Form.Item name="checkPerform" valuePropName="checked" noStyle>
              <Checkbox>Hiệu năng</Checkbox>
            </Form.Item>
            <Form.Item name="checkEdgeCase" valuePropName="checked" noStyle>
              <Checkbox>Edge case</Checkbox>
            </Form.Item>
          </Space>
        </Form.Item>
        <Form.Item name="testCases" label="Test cases (tuỳ chọn, dạng text/JSON)">
          <Input.TextArea rows={2} placeholder='VD: [{"input":"...","output":"..."}]' />
        </Form.Item>
      </Form>
    </Modal>
  );
}
