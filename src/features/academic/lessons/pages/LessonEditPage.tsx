import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Alert, Button, Card, Input, Skeleton, Space, Typography, message } from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import { useCanManageCourse } from "../hooks/useCanManageCourse";
import { useAdminLessonContent, useLessonContent, useUpdateLessonMeta } from "../api/lessons.api";
import { LessonContentEditor } from "../components/LessonContentEditor";
import { LessonDocumentsPanel } from "../components/LessonDocumentsPanel";
import { LessonKnowledgeBadge } from "../components/LessonKnowledgeBadge";
import { LessonVideoPreview } from "../components/LessonVideoPreview";
import { LessonVideoUpload } from "../components/LessonVideoUpload";

/**
 * Màn soạn bài học — MỘT trang, KHÔNG tab (admin-lesson-authoring-simplify): tiêu đề + mô tả, video
 * (xem trước / upload / dán id), nội dung markdown (có AI soạn), slide đính kèm. Các tab cũ
 * ("Học thử", "Bài tập", "Xem trước") đã gỡ khỏi màn này theo yêu cầu vận hành; cấu hình học thử
 * vẫn còn ở tab "Học thử" cấp khoá (CourseDetailPage → menu Khác).
 */
export default function LessonEditPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const location = useLocation();
  const routeTitle = (location.state as { lessonTitle?: string } | null)?.lessonTitle;
  const canManage = useCanManageCourse(courseId);

  // Metadata (tên/mô tả/loại) đọc qua GraphQL adminLessonContent; body markdown đọc qua REST.
  const { data: meta, isLoading: metaLoading } = useAdminLessonContent(lessonId);
  const { data: lesson, isLoading, isError, error } = useLessonContent(lessonId, "DOCUMENT");
  const updateMeta = useUpdateLessonMeta(lessonId, courseId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (meta) {
      setName(meta.name ?? "");
      setDescription(meta.description ?? "");
    }
  }, [meta]);

  if (isLoading || metaLoading) return <Skeleton active paragraph={{ rows: 8 }} />;

  if (isError || !lesson) {
    return (
      <Alert type="error" message="Không thể tải nội dung bài học" description={error?.message} />
    );
  }

  const dirty = !!meta && (name !== (meta.name ?? "") || description !== (meta.description ?? ""));

  const handleSaveMeta = () => {
    if (!name.trim()) {
      message.warning("Tên bài học không được để trống");
      return;
    }
    updateMeta.mutate(
      { name: name.trim(), description: description.trim() },
      {
        onSuccess: () => message.success("Đã lưu thông tin bài học"),
        onError: handleAdminMutationError,
      }
    );
  };

  return (
    <div>
      <Space align="center" style={{ marginBottom: 8 }} wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {meta?.name || routeTitle || "Soạn bài học"}
        </Typography.Title>
        <LessonKnowledgeBadge lessonId={lesson.lessonId} />
      </Space>
      <div>
        <Button icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }}>
          <Link to={courseId ? `/academic/courses/${courseId}` : "/academic/courses"}>
            Quay lại khoá học
          </Link>
        </Button>
      </div>

      {!canManage && (
        <Alert
          type="warning"
          message="Chế độ chỉ đọc"
          description="Bạn không có quyền chỉnh sửa khoá học này."
          style={{ marginBottom: 16 }}
        />
      )}

      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Card
          title="Thông tin bài học"
          extra={
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveMeta}
              loading={updateMeta.isPending}
              disabled={!canManage || !dirty}
            >
              Lưu
            </Button>
          }
        >
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <Typography.Text type="secondary">Tiêu đề</Typography.Text>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canManage}
              placeholder="Tên bài học"
            />
            <Typography.Text type="secondary">Mô tả</Typography.Text>
            <Input.TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={!canManage}
              placeholder="Mô tả ngắn hiển thị trong danh sách bài học"
            />
          </Space>
        </Card>

        <Card title="Video">
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <LessonVideoPreview lessonId={lesson.lessonId} />
            <LessonVideoUpload
              lessonId={lesson.lessonId}
              lessonTitle={name || routeTitle}
              disabled={!canManage}
            />
          </Space>
        </Card>

        <Card title="Nội dung">
          <LessonContentEditor lesson={lesson} disabled={!canManage} />
        </Card>

        <LessonDocumentsPanel lessonId={lesson.lessonId} disabled={!canManage} />
      </Space>
    </div>
  );
}
