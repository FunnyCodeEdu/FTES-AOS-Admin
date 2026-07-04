import { useParams } from "react-router-dom";
import { Alert, Button, Card, Skeleton, Tabs, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useCanManageCourse } from "../hooks/useCanManageCourse";
import { useLessonContent } from "../api/lessons.api";
import { LessonContentEditor } from "../components/LessonContentEditor";
import { LessonPreviewConfig } from "../components/LessonPreviewConfig";

export default function LessonEditPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const canManage = useCanManageCourse(courseId);
  const { data: lesson, isLoading, isError, error } = useLessonContent(lessonId, "DOCUMENT");

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

  const items = [
    {
      key: "content",
      label: "Nội dung",
      children: <LessonContentEditor lesson={lesson} disabled={!canManage} />,
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
  ];

  return (
    <div>
      <Typography.Title level={3}>Soạn bài học</Typography.Title>
      <Button icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }}>
        <Link to={courseId ? `/academic/courses/${courseId}` : "/academic/courses"}>
          Quay lại khoá học
        </Link>
      </Button>
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
