import { useEffect, useMemo, useState } from "react";
import {
  Alert, Button, Checkbox, Input, InputNumber, Modal, Radio, Select, Space, Tag, Typography, message,
} from "antd";
import { RobotOutlined } from "@ant-design/icons";
import {
  submitChallengeDraft,
  submitChallengeFromLesson,
  type ChallengeDraft,
  type ChallengeGenResult,
} from "../api";
import { useAiJobPolling } from "../hooks/useAiJobPolling";
import { createChallengesBatch } from "../../challenge-bank/api/challengeBank.api";

/** 8 giá trị của ChallengeType phía BE — gửi giá trị lạ thì BE từ chối cả bản nháp. */
const TYPES = ["CODE", "CODING", "SQL", "MULTIPLE_CHOICE", "ESSAY", "UIUX", "AI", "BUSINESS"];

/** Dưới ngưỡng này thì AI tự nhận là không chắc — cảnh báo giảng viên rà kỹ trước khi tạo. */
const LOW_CONFIDENCE = 0.6;

interface ChallengeGenerateModalProps {
  open: boolean;
  onClose: () => void;
  /** Có lessonId thì mở sẵn chế độ "sinh từ bài học"; không có thì chỉ còn đường dán đề. */
  lessonId?: string;
  courseId?: string;
  /** Gọi sau khi tạo xong để màn cha tải lại danh sách. */
  onCreated?: (count: number) => void;
}

/**
 * Sinh challenge bằng AI — một màn cho CẢ HAI đường:
 *
 * - **Dán đề**: giảng viên ném nguyên đoạn đề vào, AI tự phân tích và điền. Có vì màn tạo tay hiện
 *   quá nhiều bước: 391 challenge trên prod dồn vào hai loại dễ nhập nhất (ESSAY 211, CODE 171),
 *   bốn loại còn lại cộng lại được 9 bài.
 * - **Sinh từ bài học**: chọn loại + số lượng, AI đọc nội dung bài rồi trả một danh sách để tick.
 *
 * Hai đường dùng chung một shape bản nháp nên chung luôn màn xem trước này. AI KHÔNG ghi thẳng vào
 * DB: nó trả bản nháp, giảng viên tick rồi mới tạo thật.
 */
export function ChallengeGenerateModal({
  open, onClose, lessonId, courseId, onCreated,
}: ChallengeGenerateModalProps) {
  const [mode, setMode] = useState<"prompt" | "lesson">(lessonId ? "lesson" : "prompt");

  // Modal luôn được mount (chỉ đổi prop `open`) nên state khởi tạo CHỈ chạy một lần. Ở tab Kho
  // challenge, bài đích chọn ở cột trái sau khi component đã mount — không đồng bộ lại thì mở modal
  // ra vẫn kẹt ở "dán đề" dù đã chọn bài, và ngược lại bỏ chọn bài thì kẹt ở chế độ không dùng được.
  useEffect(() => {
    setMode(lessonId ? "lesson" : "prompt");
  }, [lessonId]);
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<string | undefined>(undefined);
  const [count, setCount] = useState(5);
  const [jobId, setJobId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);

  const poll = useAiJobPolling<ChallengeGenResult>(jobId);
  const drafts = useMemo<ChallengeDraft[]>(
    () => (poll.isComplete ? (poll.result?.drafts ?? []) : []),
    [poll.isComplete, poll.result],
  );

  // Mỗi lần có kết quả mới thì chọn sẵn tất cả — giảng viên thường lấy hết rồi bỏ vài cái, bỏ
  // nhanh hơn tick từng cái.
  useEffect(() => {
    setPicked(new Set(drafts.map((_, i) => i)));
  }, [drafts]);

  const reset = () => {
    setJobId(null);
    setPicked(new Set());
    setPrompt("");
  };

  const submit = () => {
    setJobId(null);
    const useLesson = mode === "lesson" && !!lessonId;
    const request = useLesson
      ? submitChallengeFromLesson({ lessonId: lessonId as string, type, count, language: "vi" })
      : submitChallengeDraft({ prompt, type, language: "vi" });
    request
      .then((ref) => setJobId(ref.jobId))
      .catch((err: Error) => message.error(err.message || "Không gửi được yêu cầu"));
  };

  const create = () => {
    const items = drafts
      .filter((_, i) => picked.has(i))
      .map((d) => ({
        // lessonId đi RIÊNG chứ không nằm trong phần thân: CreateChallengeRequest của BE có
        // courseId nhưng không có lessonId, mà Jackson bỏ qua field lạ nên nhét vào đó thì nó rơi
        // lặng lẽ — request vẫn 200 còn cột lesson_id ở lại null (đo được khi chạy end-to-end).
        lessonId,
        challenge: {
          title: d.title,
          description: d.description,
          type: d.type,
          // Khoá thì nằm trong thân được vì record có sẵn field này.
          courseId,
          gradingConfig: d.grading_config ? JSON.stringify(d.grading_config) : undefined,
          tags: d.tags ?? undefined,
        },
        // Phần con đi CÙNG lượt tạo. Bỏ chúng lại thì challenge sinh ra rỗng ruột — với đề chấm
        // bằng test case, sandbox chia tổng weight = 0 nên mọi học viên nhận 0 điểm mà không có
        // lỗi nào báo, và chỉ lộ ra rất lâu sau khi mentor bấm Tạo.
        testCases: d.test_cases?.map((tc, i) => ({
          // BE tự sinh name/thời gian/bộ nhớ nếu thiếu, nhưng gửi sẵn thì bản ghi tự mô tả hơn.
          name: `Case ${i + 1}`,
          input: tc.input,
          expectedOutput: tc.expected,
          weight: tc.weight ?? 1,
          hidden: tc.hidden ?? false,
          timeLimitMs: 2000,
          memoryLimitMb: 256,
          orderNo: i,
        })) ?? null,
        mcq: d.mcq?.map((q, i) => ({
          question: q.question,
          options: q.options,
          correctKeys: q.correct_keys,
          points: q.points ?? 1,
          orderNo: i,
        })) ?? null,
        rubrics: d.rubric?.map((r, i) => ({
          criterion: r.criterion,
          description: r.description ?? "",
          maxScore: r.max_score,
          orderNo: i,
        })) ?? null,
      }));
    if (items.length === 0) {
      message.warning("Chưa chọn bản nháp nào");
      return;
    }
    setCreating(true);
    createChallengesBatch(items)
      .then((created) => {
        message.success(`Đã tạo ${created.length} challenge`);
        onCreated?.(created.length);
        reset();
        onClose();
      })
      .catch((err: Error) => message.error(err.message || "Tạo thất bại"))
      .finally(() => setCreating(false));
  };

  const toggle = (index: number) => {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <Modal
      open={open}
      onCancel={() => { reset(); onClose(); }}
      title={<Space><RobotOutlined />Sinh challenge bằng AI</Space>}
      width={860}
      footer={
        drafts.length > 0
          ? [
              <Button key="again" onClick={submit} disabled={poll.isRunning || creating}>
                Sinh lại
              </Button>,
              <Button key="create" type="primary" loading={creating} onClick={create}>
                Tạo {picked.size} challenge
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={() => { reset(); onClose(); }}>Đóng</Button>,
              <Button
                key="go"
                type="primary"
                loading={poll.isRunning}
                disabled={mode === "prompt" && prompt.trim().length === 0}
                onClick={submit}
              >
                Sinh bản nháp
              </Button>,
            ]
      }
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {lessonId ? (
          <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} buttonStyle="solid">
            <Radio.Button value="lesson">Sinh từ bài học này</Radio.Button>
            <Radio.Button value="prompt">Dán đề có sẵn</Radio.Button>
          </Radio.Group>
        ) : null}

        <Space wrap>
          <Select
            allowClear
            style={{ minWidth: 220 }}
            placeholder="Loại challenge (để trống = AI tự đoán)"
            value={type}
            onChange={setType}
            options={TYPES.map((v) => ({ value: v, label: v }))}
          />
          {mode === "lesson" ? (
            <Space>
              <span>Số lượng</span>
              <InputNumber min={1} max={10} value={count} onChange={(v) => setCount(v ?? 5)} />
            </Space>
          ) : null}
        </Space>

        {mode === "prompt" ? (
          <Input.TextArea
            rows={8}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={"Dán nguyên đề vào đây. Ví dụ:\n\nBài 1 - Sửa endpoint\nThiết kế lại:\nGET  /api/getStudents\nPOST /api/addStudent\n..."}
          />
        ) : null}

        {poll.isFailed ? (
          <Alert
            type="error"
            showIcon
            message="AI không sinh được bản nháp"
            description={poll.job?.errorCode ?? "Thử lại, hoặc mô tả đề rõ hơn."}
          />
        ) : null}

        {drafts.length > 0 ? (
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <Typography.Text type="secondary">
              Tick những bài muốn giữ rồi bấm Tạo. Bản nháp chưa được lưu vào hệ thống.
            </Typography.Text>
            {drafts.map((d, i) => (
              <div
                key={`${d.title}-${i}`}
                style={{ border: "1px solid #eee", borderRadius: 8, padding: "10px 12px" }}
              >
                <Checkbox checked={picked.has(i)} onChange={() => toggle(i)}>
                  <Space wrap>
                    <Typography.Text strong>{d.title}</Typography.Text>
                    <Tag>{d.type}</Tag>
                    {d.difficulty ? <Tag color="blue">{d.difficulty}</Tag> : null}
                    {typeof d.confidence === "number" && d.confidence < LOW_CONFIDENCE ? (
                      <Tag color="warning">AI không chắc — nên rà kỹ</Tag>
                    ) : null}
                  </Space>
                </Checkbox>
                <Typography.Paragraph
                  type="secondary"
                  ellipsis={{ rows: 3, expandable: true, symbol: "xem thêm" }}
                  style={{ marginBottom: 0, marginTop: 6 }}
                >
                  {d.description}
                </Typography.Paragraph>
              </div>
            ))}
          </Space>
        ) : null}
      </Space>
    </Modal>
  );
}
