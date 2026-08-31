import { useMemo, useState } from "react";
import { Alert, Button, Card, Empty, InputNumber, Select, Skeleton, Space, Typography, message } from "antd";
import { BulbOutlined } from "@ant-design/icons";
import { CourseSelect } from "../../../academic/components/CourseSelect";
import { useCourse } from "../../../academic/courses/api/courses.api";
import { useLessonPreview, useLessonStream } from "../../../academic/lessons/api/lessons.api";
import { useIsMobile } from "../../../../shared/hooks/useIsMobile";
import { adminErrorMessage } from "../../../../shared/api/errors";
import { useCreateClip, useCreateHighlights, useHighlightJob } from "../api/shortvideo.api";
import { HighlightSuggestionCard } from "./HighlightSuggestionCard";
import { HIGHLIGHT_JOB_STATUS_LABEL } from "../format";
import type { CourseTreeNode } from "../../../academic/types";
import type { HighlightJob } from "../types";

export interface VideoLessonOption {
  value: string;
  label: string;
}

/** Rút các bài học LOẠI VIDEO khỏi cây khoá học — chỉ chúng mới có transcript để AI đọc. */
export function pickVideoLessons(tree: CourseTreeNode[] | undefined): VideoLessonOption[] {
  const out: VideoLessonOption[] = [];
  for (const section of tree ?? []) {
    for (const node of section.children ?? []) {
      if (node.type !== "lesson" || node.lessonType !== "VIDEO") continue;
      const id = node.id ?? node.key;
      if (!id) continue;
      out.push({ value: id, label: `${section.title} · ${node.title}` });
    }
  }
  return out;
}

/**
 * Phần "Tạo clip": chọn khoá → chọn bài học có video → nhờ AI đề xuất highlight → sửa mốc → cắt.
 *
 * <p>`videoId` KHÔNG do admin gõ: nó lấy từ manifest phát của bài học (`videoRef` của
 * `GET /courses/lessons/{id}/stream`) — đó chính là id video bên dịch vụ upload mà service cắt
 * hiểu được. Bài học nhúng YouTube thì không cắt được, vì máy cắt là hạ tầng tự-host của FTES chứ
 * không với tới file gốc trên YouTube; ca đó nói thẳng ra thay vì để bấm rồi lỗi.
 */
export function CreateClipPanel() {
  const isMobile = useIsMobile();
  const [courseId, setCourseId] = useState<string | undefined>();
  const [lessonId, setLessonId] = useState<string | undefined>();
  const [count, setCount] = useState<number>(5);
  const [job, setJob] = useState<HighlightJob | null>(null);

  const course = useCourse(courseId);
  const stream = useLessonStream(lessonId);
  const preview = useLessonPreview(lessonId);
  const createHighlights = useCreateHighlights();
  const createClip = useCreateClip();

  // Chỉ hỏi lại job khi BE nói còn RUNNING — response của POST thường đã kèm suggestions.
  const liveJob = useHighlightJob(job?.id, job?.status === "RUNNING");
  const currentJob = liveJob.data ?? job;

  const lessonOptions = useMemo(() => pickVideoLessons(course.data?.tree), [course.data?.tree]);

  const videoId = stream.data?.videoRef ?? undefined;
  const isYoutube = stream.data?.provider === "YOUTUBE";
  const durationMs = preview.data?.videoDurationSeconds
    ? preview.data.videoDurationSeconds * 1000
    : null;

  const canSuggest = Boolean(videoId) && !isYoutube && !createHighlights.isPending;

  const handleSuggest = () => {
    if (!videoId) return;
    setJob(null);
    createHighlights.mutate(
      { videoId, lessonId, courseId, count },
      {
        onSuccess: (result) => {
          setJob(result);
          if (result.status === "FAILED") {
            message.warning(result.error || "AI không đề xuất được đoạn nào cho video này.");
          }
        },
      }
    );
  };

  const handleCut = (values: {
    suggestionId: string;
    startMs: number;
    endMs: number;
    title: string;
  }) => {
    if (!videoId) return;
    createClip.mutate(
      { ...values, videoId, lessonId, courseId },
      { onSuccess: () => message.success("Đã gửi yêu cầu cắt clip — theo dõi ở tab Studio.") }
    );
  };

  const suggestions = currentJob?.suggestions ?? [];

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Card size="small">
        <Space
          direction={isMobile ? "vertical" : "horizontal"}
          size={12}
          wrap
          style={{ width: "100%" }}
        >
          <CourseSelect
            value={courseId}
            onChange={(value) => {
              setCourseId(value);
              setLessonId(undefined);
              setJob(null);
            }}
            style={{ width: isMobile ? "100%" : 280 }}
          />
          <Select
            placeholder="Chọn bài học có video"
            value={lessonId}
            onChange={(value) => {
              setLessonId(value);
              setJob(null);
            }}
            options={lessonOptions}
            loading={course.isLoading}
            disabled={!courseId}
            showSearch
            allowClear
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            style={{ width: isMobile ? "100%" : 340 }}
          />
          <Space size={6}>
            <Typography.Text type="secondary">Số đoạn</Typography.Text>
            <InputNumber
              min={1}
              max={10}
              value={count}
              onChange={(value) => setCount(value ?? 5)}
              style={{ width: 72 }}
              aria-label="Số đoạn đề xuất"
            />
          </Space>
          <Button
            type="primary"
            icon={<BulbOutlined />}
            block={isMobile}
            size={isMobile ? "large" : "middle"}
            loading={createHighlights.isPending}
            disabled={!canSuggest}
            onClick={handleSuggest}
          >
            Đề xuất highlight
          </Button>
        </Space>
      </Card>

      {courseId && !course.isLoading && lessonOptions.length === 0 && (
        <Alert
          type="info"
          showIcon
          message="Khoá này chưa có bài học nào loại VIDEO — chưa cắt được clip."
        />
      )}

      {lessonId && isYoutube && (
        <Alert
          type="warning"
          showIcon
          message="Bài học đang nhúng YouTube"
          description="Máy cắt clip chỉ làm việc với video tự-host của FTES. Hãy kéo video về hệ thống (tab Video của bài học) rồi quay lại."
        />
      )}

      {lessonId && !stream.isLoading && !videoId && !isYoutube && (
        <Alert
          type="warning"
          showIcon
          message="Bài học chưa gắn video phát được — chưa có gì để cắt."
        />
      )}

      {createHighlights.isError && (
        <Alert
          type="error"
          showIcon
          message="Không lấy được đề xuất"
          description={adminErrorMessage(createHighlights.error)}
        />
      )}

      {currentJob && currentJob.status !== "READY" && (
        <Alert
          type={currentJob.status === "FAILED" ? "error" : "info"}
          showIcon
          message={HIGHLIGHT_JOB_STATUS_LABEL[currentJob.status]}
          description={currentJob.error ?? undefined}
        />
      )}

      {createHighlights.isPending ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : suggestions.length > 0 ? (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {suggestions.map((suggestion) => (
            <HighlightSuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              videoDurationMs={durationMs}
              cutting={createClip.isPending}
              onCut={handleCut}
            />
          ))}
        </Space>
      ) : currentJob?.status === "READY" ? (
        <Empty description="AI không tìm được đoạn nào đáng cắt trong video này." />
      ) : (
        <Empty description="Chọn bài học có video rồi bấm “Đề xuất highlight”." />
      )}
    </Space>
  );
}
