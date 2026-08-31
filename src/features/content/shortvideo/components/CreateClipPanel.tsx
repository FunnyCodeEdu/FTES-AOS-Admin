import { useMemo, useState } from "react";
import { Alert, Button, Card, Empty, InputNumber, Select, Skeleton, Space, Typography, message } from "antd";
import { BulbOutlined } from "@ant-design/icons";
import { CourseSelect } from "../../../academic/components/CourseSelect";
import { useCourse } from "../../../academic/courses/api/courses.api";
import { useLessonPreview, useLessonStream } from "../../../academic/lessons/api/lessons.api";
import { useIsMobile } from "../../../../shared/hooks/useIsMobile";
import { adminErrorMessage } from "../../../../shared/api/errors";
import { useCreateClip, useCreateHighlights, useHighlightJob } from "../api/shortvideo.api";
import { HighlightSuggestionCard, cutSignatureOf } from "./HighlightSuggestionCard";
import type { CutRequest } from "./HighlightSuggestionCard";
import { HIGHLIGHT_JOB_STATUS_LABEL } from "../format";
import type { CourseTreeNode } from "../../../academic/types";
import type { HighlightJob } from "../types";

export interface VideoLessonOption {
  value: string;
  label: string;
  /** Mô tả buổi học — hiện dưới tên trong danh sách chọn để admin biết buổi đó dạy gì. */
  description?: string;
}

/** Rút các bài học LOẠI VIDEO khỏi cây khoá học — chỉ chúng mới có transcript để AI đọc. */
export function pickVideoLessons(tree: CourseTreeNode[] | undefined): VideoLessonOption[] {
  const out: VideoLessonOption[] = [];
  for (const section of tree ?? []) {
    for (const node of section.children ?? []) {
      if (node.type !== "lesson" || node.lessonType !== "VIDEO") continue;
      const id = node.id ?? node.key;
      if (!id) continue;
      out.push({
        value: id,
        label: `${section.title} · ${node.title}`,
        description: node.description ?? undefined,
      });
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
  // Mặc định 15–60 giây: khoảng dùng được ngay cho Tin/Reels mà không phải cắt lại.
  const [minSeconds, setMinSeconds] = useState<number>(15);
  const [maxSeconds, setMaxSeconds] = useState<number>(60);
  const [job, setJob] = useState<HighlightJob | null>(null);
  // Đề xuất nào đã gửi đi cắt rồi → chữ ký của lần gửi đó (mốc + tiêu đề lúc bấm).
  //
  // Vì sao trang phải nhớ: hợp đồng §3 KHÔNG hứa `POST /clips` idempotent, mà cắt xong thẻ không đổi
  // gì (clip nằm ở tab Studio) — không có dấu vết nào thì bấm hai lần là hai job ffmpeg cho cùng một
  // đoạn. Rẻ hơn nhiều so với bắt BE thêm idempotency key. Nhớ ở đây chứ không nhớ trong từng thẻ vì
  // thẻ bị unmount khi đổi bài học / xin đề xuất mới.
  const [cutSignatures, setCutSignatures] = useState<Record<string, string>>({});

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

  /** Xin đề xuất mới / đổi bài học ⇒ danh sách đề xuất cũ đi hết, dấu "đã cắt" theo id cũ cũng vậy. */
  const resetJob = () => {
    setJob(null);
    setCutSignatures({});
  };

  const handleSuggest = () => {
    if (!videoId) return;
    resetJob();
    createHighlights.mutate(
      { videoId, lessonId, courseId, count, minSeconds, maxSeconds },
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

  const handleCut = (values: CutRequest) => {
    if (!videoId) return;
    createClip.mutate(
      { ...values, videoId, lessonId, courseId },
      {
        onSuccess: () => {
          // Ghi dấu TRƯỚC khi báo thành công: từ đây thẻ tự khoá nút lại, `message` chỉ là lời nhắc
          // thêm chứ không còn là thứ duy nhất cho biết đã bấm.
          setCutSignatures((prev) => ({
            ...prev,
            [values.suggestionId]: cutSignatureOf(values),
          }));
          message.success("Đã gửi yêu cầu cắt clip — theo dõi ở tab Studio.");
        },
      }
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
              resetJob();
            }}
            style={{ width: isMobile ? "100%" : 280 }}
          />
          <Select
            placeholder="Chọn bài học có video"
            value={lessonId}
            onChange={(value) => {
              setLessonId(value);
              resetJob();
            }}
            options={lessonOptions}
            loading={course.isLoading}
            disabled={!courseId}
            showSearch
            allowClear
            // Hiện MÔ TẢ buổi học dưới tên: danh sách chỉ có "Phần 2 · Buổi 3" thì admin không biết
            // buổi đó dạy gì để chọn đoạn cắt cho đúng chủ đề.
            optionRender={(option) => {
              const item = option.data as VideoLessonOption;
              return (
                <div>
                  <div>{item.label}</div>
                  {item.description ? (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                      {item.description}
                    </Typography.Text>
                  ) : null}
                </div>
              );
            }}
            filterOption={(input, option) =>
              `${option?.label ?? ""} ${(option as VideoLessonOption | undefined)?.description ?? ""}`
                .toLowerCase()
                .includes(input.toLowerCase())
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
          {/* shortvideo-clip-length-bounds: trước đây chỉ chọn được SỐ đoạn, còn dài bao nhiêu thì
              phó mặc model — ra một mẻ lẫn lộn 12 giây với 2 phút, không dùng thẳng cho Tin/Reels
              được. BE loại đoạn nằm ngoài khoảng (không nắn về biên). */}
          <Space size={6}>
            <Typography.Text type="secondary">Độ dài mỗi đoạn (giây)</Typography.Text>
            <InputNumber
              min={5}
              max={180}
              value={minSeconds}
              onChange={(value) => setMinSeconds(value ?? 15)}
              style={{ width: 72 }}
              aria-label="Độ dài tối thiểu mỗi đoạn (giây)"
            />
            <Typography.Text type="secondary">–</Typography.Text>
            <InputNumber
              min={5}
              max={180}
              value={maxSeconds}
              onChange={(value) => setMaxSeconds(value ?? 60)}
              style={{ width: 72 }}
              aria-label="Độ dài tối đa mỗi đoạn (giây)"
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
              // Chỉ thẻ ĐANG gửi mới khoá và quay. `isPending` trần làm mọi thẻ cùng quay và khoá
              // hết ô mốc, trong khi cắt clip này không cấm gì việc sửa mốc của clip kia.
              cutting={
                createClip.isPending && createClip.variables?.suggestionId === suggestion.id
              }
              lastCutSignature={cutSignatures[suggestion.id] ?? null}
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
