import { useState } from "react";
import { Card, Modal, Radio, Space, Typography } from "antd";

export type ExerciseKind = "quiz" | "assignment" | "challenge";

interface AddExerciseModalProps {
  open: boolean;
  /** Ẩn lựa chọn challenge nếu thiếu permission challenge.manage. */
  allowChallenge: boolean;
  onClose: () => void;
  onPick: (kind: ExerciseKind) => void;
}

interface KindOption {
  value: ExerciseKind;
  title: string;
  desc: string;
}

const OPTIONS: KindOption[] = [
  { value: "quiz", title: "Quiz trắc nghiệm", desc: "Bộ câu hỏi chấm tự động (một/nhiều đáp án, đúng/sai)." },
  { value: "assignment", title: "Assignment code GitHub", desc: "Nộp bài qua repo GitHub, AI chấm theo tiêu chí." },
  { value: "challenge", title: "Challenge", desc: "Thử thách MCQ / Code / Essay, có bảng xếp hạng." },
];

export function AddExerciseModal({ open, allowChallenge, onClose, onPick }: AddExerciseModalProps) {
  const [selected, setSelected] = useState<ExerciseKind>("quiz");
  const options = OPTIONS.filter((o) => o.value !== "challenge" || allowChallenge);

  return (
    <Modal
      title="Thêm bài tập"
      open={open}
      onCancel={onClose}
      okText="Tiếp tục"
      onOk={() => onPick(selected)}
      width={560}
    >
      <Radio.Group
        style={{ width: "100%" }}
        value={selected}
        onChange={(e) => setSelected(e.target.value as ExerciseKind)}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          {options.map((o) => (
            <Card
              key={o.value}
              size="small"
              hoverable
              onClick={() => setSelected(o.value)}
              style={{
                borderColor: selected === o.value ? "#1677ff" : undefined,
              }}
            >
              <Radio value={o.value}>
                <Typography.Text strong>{o.title}</Typography.Text>
                <br />
                <Typography.Text type="secondary">{o.desc}</Typography.Text>
              </Radio>
            </Card>
          ))}
        </Space>
      </Radio.Group>
    </Modal>
  );
}
