import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Alert, Button, Card, Input, Skeleton, Space, Typography, message } from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import { useMe } from "../../../auth/api";
import { hasPermission } from "../../../../shared/permissions";
import { useCanManageCourse } from "../hooks/useCanManageCourse";
import { useCourse } from "../../courses/api/courses.api";
import { useAdminLessonContent, useLessonContent, useUpdateLessonMeta } from "../api/lessons.api";
import type { LessonType } from "../types";
import { LessonContentEditor } from "../components/LessonContentEditor";
import { LessonDocumentsPanel } from "../components/LessonDocumentsPanel";
import { LessonKnowledgeBadge } from "../components/LessonKnowledgeBadge";
import { LessonTrialConfig } from "../components/LessonTrialConfig";
import { LessonVideoPreview } from "../components/LessonVideoPreview";
import { LessonVideoUpload } from "../components/LessonVideoUpload";
import { LessonExercisesCard } from "../components/LessonExercisesCard";

/**
 * Màn soạn bài học — MỘT trang, KHÔNG tab (admin-lesson-authoring-simplify): tiêu đề + mô tả, và các
 * thẻ RENDER THEO LOẠI bài — VIDEO → xem trước + upload; DOCUMENT → nội dung markdown (có AI soạn);
 * SLIDE → tài liệu đính kèm. Học thử cấu hình ngay tại đây theo bài (LessonTrialConfig); mặc định
 * cấp khoá vẫn ở tab "Học thử" của CourseDetailPage.
 */
export default function LessonEditPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const location = useLocation();
  const routeTitle = (location.state as { lessonTitle?: string } | null)?.lessonTitle;
  const canManage = useCanManageCourse(courseId);
  // Gate hành động THỬ THÁCH tách khỏi gate sửa bài (mirror union cũ của tab "Kho thử thách"):
  // course.manage/ownership HOẶC challenge.manage GLOBAL. Moderator chỉ có challenge.manage vẫn
  // tạo/public/thu-về challenge được dù không sửa được nội dung bài học.
  const { data: me } = useMe();
  const canManageChallenge =
    canManage || (me ? hasPermission(me.permissions, "challenge.manage") : false);
  // Giá/loại khoá cho cảnh báo lộ nội dung trả phí khi public challenge (useCourse đã cache từ
  // trang khoá học). Chỉ cần basePrice/saleMode cho assessPublishRisk.
  const { data: course } = useCourse(courseId);

  // Metadata (tên/mô tả/loại) đọc qua GraphQL adminLessonContent; body markdown đọc qua REST.
  const { data: meta, isLoading: metaLoading } = useAdminLessonContent(lessonId);
  // B3 (LESSON_TYPE_MISMATCH): loại bài lấy TỪ meta thật, KHÔNG hardcode "DOCUMENT" — bài VIDEO/SLIDE
  // trước đây bị coi là DOCUMENT khiến editor markdown ghi nhầm nội dung sai loại.
  const lessonType = (meta?.type as LessonType) ?? "DOCUMENT";
  const { data: lesson, isLoading, isError, error } = useLessonContent(lessonId, lessonType);
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
          {/* B4: quay lại đúng tab "Bài học" (CourseDetailPage seed activeKey từ ?tab=). */}
          <Link to={courseId ? `/academic/courses/${courseId}?tab=lessons` : "/academic/courses"}>
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

        {/* B3: thẻ Video CHỈ cho bài VIDEO. */}
        {lessonType === "VIDEO" && (
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
        )}

        {/* B3: thẻ nội dung markdown CHỈ cho bài DOCUMENT (LessonContentEditor vẫn giữ guard an toàn). */}
        {lessonType === "DOCUMENT" && (
          <Card title="Nội dung">
            <LessonContentEditor lesson={lesson} disabled={!canManage} />
          </Card>
        )}

        {/* B5: học thử theo bài — % cho CẢ DOCUMENT lẫn VIDEO (video-preview-admin-gate: video nay gate
            theo preview_percent). SLIDE/QUIZ không có học thử. */}
        {(lessonType === "DOCUMENT" || lessonType === "VIDEO") && (
          <LessonTrialConfig
            lessonId={lesson.lessonId}
            courseId={courseId}
            lessonType={lessonType}
            disabled={!canManage}
          />
        )}

        {/* SLIDE → tài liệu; DOCUMENT/VIDEO cũng có thể đính kèm tài liệu bổ trợ. */}
        <LessonDocumentsPanel lessonId={lesson.lessonId} disabled={!canManage} />

        {/* Thực hành theo bài: thử thách + bài tập + quiz (course-per-lesson-exercises). */}
        <LessonExercisesCard
          lessonId={lesson.lessonId}
          courseId={courseId}
          lessonName={name || routeTitle}
          course={course ? { basePrice: course.basePrice, saleMode: course.saleMode } : undefined}
          canManage={canManage}
          canManageChallenge={canManageChallenge}
          lessonFree={meta?.free}
        />
      </Space>
    </div>
  );
}
