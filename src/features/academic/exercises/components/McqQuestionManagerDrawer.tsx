import { useEffect, useRef } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Drawer,
  Form,
  Input,
  InputNumber,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { MinusCircleOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import { useAdminChallengeDetail, useUpsertChallengeMcq } from "../api/exercises.api";
import type { ChallengeMcqQuestionView, ChallengeView } from "../types";
import { buildMcqQuestionItems, type McqRow } from "./ChallengeWizardDrawer";

const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];

interface McqFormValues {
  mcq?: McqRow[];
}

interface Props {
  open: boolean;
  challenge: Pick<ChallengeView, "id" | "title" | "type"> | null;
  disabled?: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function mcqViewsToRows(views: ChallengeMcqQuestionView[] | null | undefined): McqRow[] {
  const rows = [...(views ?? [])]
    .sort((a, b) => a.orderNo - b.orderNo)
    .map((q) => {
      const correct = new Set(q.correctKeys ?? []);
      return {
        question: q.question,
        options: q.options.map((option) => ({
          text: option.text,
          correct: correct.has(option.key),
        })),
        explanation: q.explanation ?? "",
        points: q.points,
      };
    });
  return rows.length > 0 ? rows : [emptyMcqRow()];
}

function emptyMcqRow(): McqRow {
  return {
    question: "",
    options: [
      { text: "", correct: false },
      { text: "", correct: false },
    ],
    explanation: "",
    points: 1,
  };
}

/** Trình sửa toàn bộ câu hỏi/đáp án của challenge MCQ đã tạo. */
export function McqQuestionManagerDrawer({
  open,
  challenge,
  disabled,
  onClose,
  onSaved,
}: Props) {
  const [form] = Form.useForm<McqFormValues>();
  const challengeId = challenge?.id;
  const query = useAdminChallengeDetail(challengeId, open);
  const upsert = useUpsertChallengeMcq();
  const dirtyRef = useRef(false);
  const questions = query.data?.mcqQuestions ?? [];
  const answerDataAvailable =
    query.isSuccess && questions.every((question) => Array.isArray(question.correctKeys));

  useEffect(() => {
    if (!open || !challengeId) {
      dirtyRef.current = false;
      form.resetFields();
      return;
    }
    if (!query.isSuccess || query.isFetching || dirtyRef.current || !answerDataAvailable) return;
    form.setFieldsValue({ mcq: mcqViewsToRows(query.data.mcqQuestions) });
  }, [open, challengeId, query.isSuccess, query.isFetching, query.data, answerDataAvailable, form]);

  const reload = async () => {
    const result = await query.refetch();
    const loaded = result.data?.mcqQuestions ?? [];
    if (!result.isSuccess || !loaded.every((question) => Array.isArray(question.correctKeys))) return;
    dirtyRef.current = false;
    form.setFieldsValue({ mcq: mcqViewsToRows(loaded) });
    message.success("Đã tải lại câu hỏi từ máy chủ");
  };

  const handleFinish = (values: McqFormValues) => {
    if (!challengeId || !answerDataAvailable) return;
    const built = buildMcqQuestionItems(values.mcq ?? []);
    if ("error" in built) {
      message.error(built.error);
      return;
    }
    upsert.mutate(
      { id: challengeId, questions: built.questions },
      {
        onSuccess: async () => {
          dirtyRef.current = false;
          await query.refetch();
          message.success(`Đã lưu ${built.questions.length} câu hỏi và đáp án`);
          onSaved?.();
        },
        onError: handleAdminMutationError,
      }
    );
  };

  return (
    <Drawer
      title={challenge ? `Câu hỏi & đáp án — ${challenge.title}` : "Câu hỏi & đáp án"}
      width={920}
      open={open}
      onClose={onClose}
      zIndex={1100}
      destroyOnClose
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={reload} loading={query.isFetching}>
            Tải lại
          </Button>
          <Button
            type="primary"
            onClick={() => form.submit()}
            loading={upsert.isPending}
            disabled={disabled || !challengeId || !answerDataAvailable}
          >
            Lưu câu hỏi & đáp án
          </Button>
        </Space>
      }
    >
      {disabled && (
        <Alert type="warning" showIcon message="Chế độ chỉ đọc — không có quyền sửa trắc nghiệm." />
      )}
      {challenge && challenge.type !== "MULTIPLE_CHOICE" && (
        <Alert type="warning" showIcon message="Thử thách này không phải loại trắc nghiệm." />
      )}
      {query.isError && (
        <Alert
          type="error"
          showIcon
          message="Không tải được câu hỏi trắc nghiệm"
          action={<Button onClick={reload}>Thử lại</Button>}
          style={{ marginBottom: 16 }}
        />
      )}
      {query.isSuccess && !answerDataAvailable && (
        <Alert
          type="error"
          showIcon
          message="Máy chủ chưa trả dữ liệu đáp án đúng"
          description="Để bảo vệ đáp án hiện có, chức năng lưu đã bị khóa. Hãy tải lại sau khi backend mới được triển khai."
          style={{ marginBottom: 16 }}
        />
      )}
      <Typography.Paragraph type="secondary">
        Có thể chọn một hoặc nhiều đáp án đúng. Điểm mỗi câu phải là số nguyên lớn hơn 0. Lời giải
        chỉ hiện cho học viên sau khi nộp theo quy tắc hiện có.
      </Typography.Paragraph>

      {query.isLoading || query.isFetching ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          onValuesChange={() => {
            dirtyRef.current = true;
          }}
          disabled={disabled || !answerDataAvailable}
        >
          <Form.List name="mcq">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }, qi) => (
                  <div
                    key={key}
                    style={{ border: "1px solid #e5e7eb", padding: 16, marginBottom: 12, borderRadius: 8 }}
                  >
                    <Space style={{ marginBottom: 8 }}>
                      <Tag color="blue">Câu {qi + 1}</Tag>
                      {fields.length > 1 && <MinusCircleOutlined onClick={() => remove(name)} />}
                    </Space>
                    <Form.Item
                      {...rest}
                      name={[name, "question"]}
                      label="Nội dung"
                      rules={[{ required: true, whitespace: true, message: "Nhập câu hỏi" }]}
                    >
                      <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.List name={[name, "options"]}>
                      {(optionFields, { add: addOption, remove: removeOption }) => (
                        <>
                          {optionFields.map(({ key: optionKey, name: optionName, ...optionRest }, oi) => (
                            <Space key={optionKey} align="baseline" style={{ display: "flex", marginBottom: 8 }}>
                              <Tag>{OPTION_KEYS[oi]}</Tag>
                              <Form.Item
                                {...optionRest}
                                name={[optionName, "text"]}
                                rules={[{ required: true, whitespace: true, message: "Nhập đáp án" }]}
                                style={{ marginBottom: 0, flex: 1 }}
                              >
                                <Input placeholder="Nội dung lựa chọn" style={{ width: 440 }} />
                              </Form.Item>
                              <Form.Item
                                {...optionRest}
                                name={[optionName, "correct"]}
                                valuePropName="checked"
                                style={{ marginBottom: 0 }}
                              >
                                <Checkbox>Đúng</Checkbox>
                              </Form.Item>
                              {optionFields.length > 2 && (
                                <MinusCircleOutlined onClick={() => removeOption(optionName)} />
                              )}
                            </Space>
                          ))}
                          {optionFields.length < OPTION_KEYS.length && (
                            <Button
                              type="dashed"
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={() => addOption({ text: "", correct: false })}
                            >
                              Thêm lựa chọn
                            </Button>
                          )}
                        </>
                      )}
                    </Form.List>
                    <Form.Item
                      {...rest}
                      name={[name, "explanation"]}
                      label="Giải thích đáp án"
                      tooltip="Hỗ trợ Markdown/LaTeX; nội dung chỉ hiện theo quy tắc review sau khi nộp."
                      style={{ marginTop: 12 }}
                    >
                      <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item
                      {...rest}
                      name={[name, "points"]}
                      label="Điểm"
                      rules={[{ required: true, message: "Nhập điểm" }]}
                    >
                      <InputNumber min={1} precision={0} />
                    </Form.Item>
                  </div>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add(emptyMcqRow())}>
                  Thêm câu hỏi
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      )}
    </Drawer>
  );
}
