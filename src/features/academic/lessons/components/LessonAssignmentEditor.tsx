import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  useCreateAssignment,
  useDeleteAssignment,
  useLessonAssignments,
  useUpdateAssignment,
} from "../../exercises/api/exercises.api";
import type { AssignmentView, CreateAssignmentRequest } from "../../exercises/types";

interface LessonAssignmentEditorProps {
  lessonId: string;
  disabled?: boolean;
}

interface AssignmentFormValues {
  title: string;
  question: string;
  expectedOutput?: string;
  criteria?: string;
  fileExtension?: string;
  testCases?: string;
  maxSubmissions?: number;
  free: boolean;
  checkLogic: boolean;
  checkPerform: boolean;
  checkEdgeCase: boolean;
}

/**
 * Soạn "Bài tập (Assignment)" THEO BÀI (course-per-lesson-exercises). List assignment của bài +
 * thêm/sửa/xoá qua modal. Field khớp CreateAssignmentRequest/UpdateAssignmentRequest của BE.
 *
 * LƯU Ý: AssignmentView (GET) KHÔNG trả lại checkLogic/checkPerform/checkEdgeCase/expectedOutput/
 * testCases → khi SỬA, các ô đó không pre-fill được (mặc định: 3 cờ check = bật, ô nội dung rỗng).
 * Lưu = ghi đè toàn phần (BE UpdateAssignmentRequest mirror Create) nên cần nhập lại nếu muốn giữ.
 */
export function LessonAssignmentEditor({ lessonId, disabled }: LessonAssignmentEditorProps) {
  const { data: assignments, isLoading, isError, error } = useLessonAssignments(lessonId);
  const createA = useCreateAssignment(lessonId);
  const updateA = useUpdateAssignment(lessonId);
  const deleteA = useDeleteAssignment(lessonId);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AssignmentView | null>(null);
  const [form] = Form.useForm<AssignmentFormValues>();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        title: editing.title,
        question: editing.question,
        criteria: editing.criteria ?? "",
        fileExtension: editing.fileExtension ?? "",
        maxSubmissions: editing.maxSubmissions,
        free: editing.free,
        expectedOutput: "",
        testCases: "",
        checkLogic: true,
        checkPerform: true,
        checkEdgeCase: true,
      });
    } else {
      form.setFieldsValue({
        title: "",
        question: "",
        criteria: "",
        fileExtension: "",
        maxSubmissions: 3,
        free: false,
        expectedOutput: "",
        testCases: "",
        checkLogic: true,
        checkPerform: true,
        checkEdgeCase: true,
      });
    }
  }, [open, editing, form]);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (a: AssignmentView) => {
    setEditing(a);
    setOpen(true);
  };

  const handleOk = () => {
    form.validateFields().then((values) => {
      const sortOrder = editing ? editing.sortOrder : (assignments?.length ?? 0);
      const body: CreateAssignmentRequest = {
        title: values.title.trim(),
        question: values.question.trim(),
        expectedOutput: values.expectedOutput?.trim() || undefined,
        criteria: values.criteria?.trim() || undefined,
        checkLogic: values.checkLogic,
        checkPerform: values.checkPerform,
        checkEdgeCase: values.checkEdgeCase,
        fileExtension: values.fileExtension?.trim() || undefined,
        sortOrder,
        maxSubmissions: values.maxSubmissions,
        free: values.free,
        testCases: values.testCases?.trim() || undefined,
      };
      const onDone = (msg: string) => {
        message.success(msg);
        setOpen(false);
      };
      if (editing) {
        updateA.mutate(
          { assignmentId: editing.id, body },
          { onSuccess: () => onDone("Đã cập nhật bài tập") }
        );
      } else {
        createA.mutate(body, { onSuccess: () => onDone("Đã tạo bài tập") });
      }
    });
  };

  const handleDelete = (a: AssignmentView) => {
    Modal.confirm({
      title: "Xoá bài tập",
      content: (
        <>
          Xoá bài tập <strong>{a.title}</strong>? Hành động không hoàn tác.
        </>
      ),
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () => deleteA.mutate({ assignmentId: a.id }),
    });
  };

  return (
    <div>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 8 }}>
        <Typography.Text strong>Bài tập (Assignment)</Typography.Text>
        {!disabled && (
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm bài tập (Assignment)
          </Button>
        )}
      </Space>

      {isError && <Alert type="error" message={error?.message} style={{ marginBottom: 8 }} />}

      {(assignments?.length ?? 0) === 0 && !isLoading ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bài học chưa có bài tập" />
      ) : (
        <List
          size="small"
          loading={isLoading}
          dataSource={assignments ?? []}
          renderItem={(a) => (
            <List.Item
              actions={
                disabled
                  ? []
                  : [
                      <Button
                        key="edit"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(a)}
                      />,
                      <Button
                        key="del"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        loading={deleteA.isPending}
                        onClick={() => handleDelete(a)}
                      />,
                    ]
              }
            >
              <List.Item.Meta
                title={a.title}
                description={
                  <Space size={4} wrap>
                    {a.free ? <Tag color="green">Miễn phí</Tag> : <Tag>Trả phí</Tag>}
                    <Tag>Nộp tối đa: {a.maxSubmissions}</Tag>
                    {a.fileExtension && <Tag>{a.fileExtension}</Tag>}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}

      <Modal
        title={editing ? "Sửa bài tập" : "Thêm bài tập"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleOk}
        confirmLoading={createA.isPending || updateA.isPending}
        okText={editing ? "Lưu" : "Tạo"}
        cancelText="Huỷ"
        width={680}
        destroyOnClose
      >
        {editing && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="Lưu = ghi đè toàn phần. Các ô Kết quả mong đợi / Test cases / cờ chấm không tải lại được từ máy chủ — nhập lại nếu muốn giữ."
          />
        )}
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: "Nhập tiêu đề" }]}>
            <Input placeholder="VD: Bài tập tối ưu truy vấn" />
          </Form.Item>
          <Form.Item name="question" label="Đề bài" rules={[{ required: true, message: "Nhập đề bài" }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="expectedOutput" label="Kết quả mong đợi">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="criteria" label="Tiêu chí chấm">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Nội dung chấm">
            <Space size="large">
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
          <Space size="large" wrap>
            <Form.Item name="fileExtension" label="Đuôi file nộp">
              <Input placeholder=".zip / .sql / .py" style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="maxSubmissions" label="Số lần nộp tối đa">
              <InputNumber min={1} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="free" label="Miễn phí" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item name="testCases" label="Test cases (tuỳ chọn, dạng text)">
            <Input.TextArea rows={3} placeholder="Chuỗi mô tả test cases cho AI chấm (nếu có)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
