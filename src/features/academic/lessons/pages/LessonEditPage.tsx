import { useLocation, useParams } from "react-router-dom";
import { Alert, Button, Card, Skeleton, Space, Tabs, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useCanManageCourse } from "../hooks/useCanManageCourse";
import { useLessonContent } from "../api/lessons.api";
import { useLessonDraftStore } from "../store/lessonDraftStore";
import { LessonContentEditor } from "../components/LessonContentEditor";
import { LessonContentVideoPreview } from "../components/LessonContentVideoPreview";
import { LessonKnowledgeBadge } from "../components/LessonKnowledgeBadge";
import { LessonPreviewConfig } from "../components/LessonPreviewConfig";
import { LessonVideoUpload } from "../components/LessonVideoUpload";
import { LessonExercisesTab } from "../../exercises/components/LessonExercisesTab";

export default function LessonEditPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  // Tên bài học đến qua route state từ danh sách bài học (LessonListTab) — dùng làm `title` khi
  // upload video. Có thể undefined nếu vào thẳng bằng URL; `title` là optional nên vẫn hợp lệ.
  const location = useLocation();
  const lessonTitle = (location.state as { lessonTitle?: string } | null)?.lessonTitle;
  const canManage = useCanManageCourse(courseId);
  const { data: lesson, isLoading, isError, error } = useLessonContent(lessonId, "DOCUMENT");
  // Bản nháp đang soạn (nếu có) để tab "Xem trước" phản ánh nội dung mới nhất, chưa cần lưu.
  const draftBody = useLessonDraftStore((s) => (lessonId ? s.drafts[lessonId] : undefined));

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;

  if (isError || !lesson) {
    return (
      <Alert
        type="error"
        message="Không thể tải nội dung bài học"
        description={error?.message}
      />
    );
  }

  const previewBody = draftBody ?? lesson.body;

  const items = [
    {
      key: "content",
      label: "Nội dung",
      children: <LessonContentEditor lesson={lesson} disabled={!canManage} />,
    },
    {
      key: "video",
      label: "Video",
      children: (
        <LessonVideoUpload
          lessonId={lesson.lessonId}
          lessonTitle={lessonTitle}
          disabled={!canManage}
        />
      ),
    },
    {
      key: "content-preview",
      label: "Xem trước",
      children: <LessonContentVideoPreview lessonId={lesson.lessonId} body={previewBody} />,
    },
    {
      key: "preview",
      label: "Học thử",
      children: courseId ? (
        <LessonPreviewConfig lessonId={lesson.lessonId} courseId={courseId} />
      ) : (
        <Alert type="warning" message="Thiếu courseId" />
      ),
    },
    {
      key: "exercises",
      label: "Bài tập",
      children: courseId ? (
        <LessonExercisesTab
          lessonId={lesson.lessonId}
          courseId={courseId}
          disabled={!canManage}
        />
      ) : (
        <Alert type="warning" message="Thiếu courseId" />
      ),
    },
  ];

  return (
    <div>
      <Space align="center" style={{ marginBottom: 8 }} wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Soạn bài học
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
      <Card>
        <Tabs items={items} />
      </Card>
    </div>
  );
}
