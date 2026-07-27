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
  Radio,
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
import type {
  AssignmentView,
  CreateAssignmentRequest,
  SubmissionMethod,
} from "../../exercises/types";

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
  submissionMethod: SubmissionMethod;
}

/** [C3] File cho phép nộp khi tác giả bật FILE hoặc BOTH. */
const allowsFile = (m: SubmissionMethod) => m === "FILE" || m === "BOTH";

const SUBMISSION_LABEL: Record<SubmissionMethod, string> = {
  GITHUB: "GitHub URL",
  FILE: "Nộp file",
  BOTH: "GitHub / File",
};

/**
 * Soạn "Bài tập (Assignment)" THEO BÀI (course-per-lesson-exercises). List assignment của bài +
 * thêm/sửa/xoá qua modal. Field khớp CreateAssignmentRequest/UpdateAssignmentRequest của BE.
 *
 * [debt #1] AssignmentView (GET) giờ trả LẠI đủ expectedOutput/testCases/checkLogic/checkPerform/
 * checkEdgeCase → form SỬA pre-fill đúng giá trị thật. Lưu = ghi đè toàn phần (BE UpdateAssignment
 * mirror Create) nhưng vì đã pre-fill nên round-trip nguyên vẹn: sửa tiêu đề không xoá cấu hình chấm.
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
      // [debt #1] BE AssignmentView giờ trả LẠI đủ trường chấm → pre-fill từ giá trị thật, không
      // còn default rỗng/true. PUT ghi đè toàn phần vì thế round-trip nguyên giá trị: sửa mỗi
      // tiêu đề không còn xoá cấu hình chấm. Optional-fallback chỉ chạm response cũ đã cache.
      form.setFieldsValue({
        title: editing.title,
        question: editing.question,
        criteria: editing.criteria ?? "",
        fileExtension: editing.fileExtension ?? "",
        maxSubmissions: editing.maxSubmissions,
        free: editing.free,
        expectedOutput: editing.expectedOutput ?? "",
        testCases: editing.testCases ?? "",
        checkLogic: editing.checkLogic ?? true,
        checkPerform: editing.checkPerform ?? true,
        checkEdgeCase: editing.checkEdgeCase ?? true,
        submissionMethod: editing.submissionMethod ?? "BOTH",
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
        submissionMethod: "GITHUB",
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
        // [C3] fileExtension chỉ có ý nghĩa khi cho phép nộp file; nếu chỉ GitHub thì bỏ.
        fileExtension: allowsFile(values.submissionMethod)
          ? values.fileExtension?.trim() || undefined
          : undefined,
        sortOrder,
        maxSubmissions: values.maxSubmissions,
        free: values.free,
        testCases: values.testCases?.trim() || undefined,
        submissionMethod: values.submissionMethod,
      };
      const onDone = (msg: string) => {
        message.success(msg);
        setOpen(false);
      };
      if (editing) {
        // [debt #1] AssignmentView giờ pre-fill đủ trường chấm → PUT (ghi đè toàn phần) round-trip
        // nguyên giá trị, sửa mỗi tiêu đề không xoá cấu hình chấm. Lưu bình thường, bỏ confirm cảnh
        // báo ghi đè vì thao tác đã an toàn.
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
                    <Tag color="blue">{SUBMISSION_LABEL[a.submissionMethod ?? "BOTH"]}</Tag>
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
          <Form.Item
            name="submissionMethod"
            label="Cách nộp bài"
            tooltip="Nộp bằng file cũng là một loại bài tập, không chỉ project/GitHub."
            rules={[{ required: true, message: "Chọn cách nộp" }]}
          >
            <Radio.Group>
              <Radio.Button value="GITHUB">GitHub URL</Radio.Button>
              <Radio.Button value="FILE">Nộp file</Radio.Button>
              <Radio.Button value="BOTH">Cả hai</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Space size="large" wrap>
            <Form.Item
              noStyle
              shouldUpdate={(prev, cur) => prev.submissionMethod !== cur.submissionMethod}
            >
              {({ getFieldValue }) =>
                allowsFile(getFieldValue("submissionMethod") as SubmissionMethod) ? (
                  <Form.Item
                    name="fileExtension"
                    label="Đuôi file nhận (whitelist)"
                    tooltip="Danh sách đuôi file được phép nộp, ngăn cách bởi dấu phẩy."
                    rules={[{ required: true, message: "Nhập đuôi file khi cho phép nộp file" }]}
                  >
                    <Input placeholder=".zip,.sql,.py" style={{ width: 200 }} />
                  </Form.Item>
                ) : null
              }
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
