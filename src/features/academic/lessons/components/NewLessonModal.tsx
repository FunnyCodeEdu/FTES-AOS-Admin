import { useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Segmented,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import { FileTextOutlined, RobotOutlined, UploadOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import { useCreateLesson } from "../api/lessons.api";
import { LessonDocGenerateModal } from "../../ai-assist/components/LessonDocGenerateModal";
import type { LessonType } from "../types";

interface NewLessonModalProps {
  open: boolean;
  courseId: string;
  sectionId: string;
  sectionTitle: string;
  /** Vị trí bài mới trong chương (= số bài hiện có). */
  sortOrder: number;
  onClose: () => void;
  onCreated?: (lessonId: string) => void;
}

interface FormValues {
  name: string;
  description?: string;
  videoRef?: string;
}

const TYPE_OPTIONS = [
  { label: "Video", value: "VIDEO" },
  { label: "Slide", value: "SLIDE" },
  { label: "Tài liệu", value: "DOCUMENT" },
];

/**
 * Popup tạo bài học: chọn loại (video / slide / tài liệu), nhập tên + mô tả, và gắn luôn nội dung —
 * link/id video, file slide, hoặc nội dung markdown do AI soạn. Tạo xong invalidate cây khoá học nên
 * danh sách bài học tự cập nhật (không cần bấm "Lưu thay đổi").
 */
export function NewLessonModal({
  open,
  courseId,
  sectionId,
  sectionTitle,
  sortOrder,
  onClose,
  onCreated,
}: NewLessonModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [type, setType] = useState<LessonType>("VIDEO");
  const [file, setFile] = useState<File | null>(null);
  const [bodyMd, setBodyMd] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const create = useCreateLesson(courseId);

  const reset = () => {
    form.resetFields();
    setType("VIDEO");
    setFile(null);
    setBodyMd("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      create.mutate(
        {
          sectionId,
          name: values.name.trim(),
          description: values.description?.trim(),
          type,
          sortOrder,
          ...(type === "VIDEO" && values.videoRef ? { videoRef: values.videoRef } : {}),
          ...(file ? { file } : {}),
          ...(type === "DOCUMENT" && bodyMd ? { bodyMd } : {}),
        },
        {
          onSuccess: (lessonId) => {
            message.success("Đã tạo bài học");
            onCreated?.(lessonId);
            handleClose();
          },
          onError: handleAdminMutationError,
        }
      );
    });
  };

  return (
    <Modal
      open={open}
      title={`Bài học mới — ${sectionTitle}`}
      onCancel={handleClose}
      onOk={handleSubmit}
      okText="Tạo bài học"
      cancelText="Huỷ"
      confirmLoading={create.isPending}
      width={640}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Loại bài học">
          <Segmented
            options={TYPE_OPTIONS}
            value={type}
            onChange={(value) => setType(value as LessonType)}
            block
          />
        </Form.Item>

        <Form.Item
          name="name"
          label="Tên bài học"
          rules={[{ required: true, message: "Nhập tên bài học" }]}
        >
          <Input placeholder="VD: Buổi 1 — Giới thiệu" />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={3} placeholder="Mô tả ngắn hiển thị trong danh sách bài học" />
        </Form.Item>

        {type === "VIDEO" && (
          <Form.Item
            name="videoRef"
            label="Video"
            extra="ID video của dịch vụ upload (video_xxx) hoặc link YouTube. Bỏ trống để tải file lên sau ở màn soạn bài."
          >
            <Input placeholder="video_xxx hoặc https://youtu.be/..." />
          </Form.Item>
        )}

        {type === "SLIDE" && (
          <Form.Item label="File slide" extra="PDF / PPT / PPTX — tải lên kho tài liệu của bài học.">
            <Upload
              accept=".pdf,.ppt,.pptx"
              maxCount={1}
              showUploadList={false}
              beforeUpload={(picked) => {
                setFile(picked);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />}>Chọn file</Button>
            </Upload>
            {file && (
              <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                {file.name}
              </Typography.Text>
            )}
          </Form.Item>
        )}

        {type === "DOCUMENT" && (
          <Form.Item label="Nội dung" extra="Có thể để trống rồi soạn tiếp ở màn soạn bài.">
            <Space direction="vertical" style={{ width: "100%" }}>
              <Can permissions={["ai.teacher.use"]}>
                <Button icon={<RobotOutlined />} onClick={() => setAiOpen(true)}>
                  Soạn bằng AI
                </Button>
              </Can>
              {bodyMd ? (
                <Alert
                  type="success"
                  showIcon
                  icon={<FileTextOutlined />}
                  message={`Đã có nội dung nháp (${bodyMd.length} ký tự)`}
                  action={
                    <Button size="small" onClick={() => setBodyMd("")}>
                      Xoá
                    </Button>
                  }
                />
              ) : null}
            </Space>
          </Form.Item>
        )}
      </Form>

      <LessonDocGenerateModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onInsert={(generated) => setBodyMd(generated)}
      />
    </Modal>
  );
}
