import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Modal,
  Skeleton,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import { PlusOutlined, ReloadOutlined, RobotOutlined, UploadOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import type { TableProps } from "antd";
import { Can } from "../../../../shared/permissions";
import type {
  QuizBulkImportResult,
  QuizFilterFormValues,
  QuizListParams,
  QuizQuestion,
} from "../../types";
import {
  toCreateQuizQuestionRequest,
  useCreateQuizQuestion,
  useDeleteQuizQuestion,
  useImportQuizQuestions,
  useQuizQuestions,
  useUpdateQuizQuestion,
} from "../api/quiz.api";
import { QuizFilters } from "../components/QuizFilters";
import { QuizFormModal } from "../components/QuizFormModal";
import { QuizTable } from "../components/QuizTable";
import { AiExamGenerateModal } from "../../ai-assist/components/AiExamGenerateModal";
import { AiDifficultyDrawer } from "../../ai-assist/components/AiDifficultyDrawer";
import type { QuizFormValues } from "../../types";

const DEFAULT_PAGE_SIZE = 10;

function parseParams(searchParams: URLSearchParams): QuizListParams {
  return {
    subjectId: searchParams.get("subjectId") || undefined,
    tag: searchParams.get("tag") || undefined,
    difficulty: (searchParams.get("difficulty") as QuizListParams["difficulty"]) || undefined,
    status: (searchParams.get("status") as QuizListParams["status"]) || undefined,
    search: searchParams.get("search") || undefined,
    page: parseInt(searchParams.get("page") || "1", 10),
    pageSize: parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10),
    sortBy: searchParams.get("sortBy") || undefined,
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || undefined,
  };
}

function buildSearchParams(values: QuizListParams): URLSearchParams {
  const params = new URLSearchParams();
  if (values.subjectId) params.set("subjectId", values.subjectId);
  if (values.tag) params.set("tag", values.tag);
  if (values.difficulty) params.set("difficulty", values.difficulty);
  if (values.status) params.set("status", values.status);
  if (values.search) params.set("search", values.search);
  params.set("page", String(values.page));
  params.set("pageSize", String(values.pageSize));
  if (values.sortBy) params.set("sortBy", values.sortBy);
  if (values.sortOrder) params.set("sortOrder", values.sortOrder);
  return params;
}

export default function QuizBankPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseParams(searchParams), [searchParams]);
  const { data, isLoading, isError, error, refetch } = useQuizQuestions(params);

  const [formOpen, setFormOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [difficultyQuestion, setDifficultyQuestion] = useState<QuizQuestion | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [importResult, setImportResult] = useState<QuizBulkImportResult | null>(null);

  const createQuestion = useCreateQuizQuestion();
  const updateQuestion = useUpdateQuizQuestion(editingQuestion);
  const deleteQuestion = useDeleteQuizQuestion();
  const importQuestions = useImportQuizQuestions();

  const filterValues: QuizFilterFormValues = useMemo(
    () => ({
      subjectId: params.subjectId,
      tag: params.tag,
      difficulty: params.difficulty,
      status: params.status,
      search: params.search,
    }),
    [params]
  );

  const handleFilterChange = (values: QuizFilterFormValues) => {
    setSearchParams(buildSearchParams({ ...params, ...values, page: 1 }));
  };

  const handleTableChange: TableProps<QuizQuestion>["onChange"] = (pagination, _filters, sorter) => {
    const singleSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    setSearchParams(
      buildSearchParams({
        ...params,
        page: pagination.current ?? 1,
        pageSize: pagination.pageSize ?? DEFAULT_PAGE_SIZE,
        sortBy: singleSorter?.field ? String(singleSorter.field) : undefined,
        sortOrder: singleSorter?.order
          ? singleSorter.order === "ascend"
            ? "asc"
            : "desc"
          : undefined,
      })
    );
  };

  const handleSubmit = (values: QuizFormValues) => {
    const mutation = editingQuestion ? updateQuestion : createQuestion;
    mutation.mutate(values, {
      onSuccess: () => {
        message.success(editingQuestion ? "Đã cập nhật câu hỏi" : "Đã tạo câu hỏi");
        setFormOpen(false);
        setEditingQuestion(null);
      },
      onError: (err: Error) => message.error(err.message || "Thao tác thất bại"),
    });
  };

  const handleDelete = (question: QuizQuestion) => {
    Modal.confirm({
      title: "Lưu trữ câu hỏi",
      content: (
        <>
          Câu hỏi sẽ chuyển sang trạng thái <strong>archived</strong> (soft-delete, giữ lịch sử làm
          bài). Thao tác được ghi audit.
        </>
      ),
      okText: "Lưu trữ",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () => {
        deleteQuestion.mutate(question.id, {
          onSuccess: () => message.success("Đã lưu trữ câu hỏi"),
          onError: (err: Error) => message.error(err.message || "Lưu trữ thất bại"),
        });
      },
    });
  };

  // Import: file .json = MẢNG câu hỏi shape create request BE
  // [{content, type, options:[{key,text}], correctKeys, subjectId?, tags?, difficulty?, status?}].
  // BE partial-success: dòng lỗi trả trong errors[{index,message}], dòng hợp lệ vẫn lưu.
  const handleUpload = (file: File) => {
    file
      .text()
      .then((text) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error("File không phải JSON hợp lệ");
        }
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error("File phải chứa MẢNG câu hỏi (không rỗng)");
        }
        importQuestions.mutate(parsed, {
          onSuccess: (result) => {
            setImportResult(result);
            if (result.failed > 0) {
              message.warning(`Import xong: ${result.imported}/${result.total} dòng thành công`);
            } else {
              message.success(`Đã import ${result.imported} câu hỏi`);
            }
          },
          onError: (err: Error) => message.error(err.message || "Import thất bại"),
        });
      })
      .catch((err: Error) => message.error(err.message || "Không đọc được file"));
    return false;
  };

  // Câu do AI sinh (đã keep/drop + sửa inline trong modal) → lưu qua ĐÚNG action bulk-import
  // sẵn có của bank (không thêm store/endpoint mới). Chỉ chạy khi giảng viên bấm "Thêm" —
  // sinh/preview KHÔNG hề gọi write. status='draft' để rà lại trước khi mở cho học viên.
  const handleAiInsert = (questions: QuizFormValues[]) => {
    if (questions.length === 0) return;
    importQuestions.mutate(questions.map(toCreateQuizQuestionRequest), {
      onSuccess: (result) => {
        setImportResult(result);
        setAiModalOpen(false);
        if (result.failed > 0) {
          message.warning(`Đã thêm ${result.imported}/${result.total} câu (một số câu lỗi)`);
        } else {
          message.success(`Đã thêm ${result.imported} câu AI vào ngân hàng`);
        }
      },
      onError: (err: Error) => message.error(err.message || "Thêm câu hỏi thất bại"),
    });
  };

  const hasFilters = Boolean(
    params.subjectId || params.tag || params.difficulty || params.status || params.search
  );

  return (
    <div>
      <Typography.Title level={3}>Quiz bank</Typography.Title>
      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <QuizFilters values={filterValues} onChange={handleFilterChange} />
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Làm mới
              </Button>
              <Can permissions={["course.manage"]}>
                <Upload beforeUpload={handleUpload} showUploadList={false} accept=".json">
                  <Button icon={<UploadOutlined />} loading={importQuestions.isPending}>
                    Import JSON
                  </Button>
                </Upload>
              </Can>
              <Can permissions={["ai.teacher.use"]}>
                <Button icon={<RobotOutlined />} onClick={() => setAiModalOpen(true)}>
                  Sinh câu hỏi bằng AI
                </Button>
              </Can>
              <Can permissions={["course.manage"]}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingQuestion(null);
                    setFormOpen(true);
                  }}
                >
                  Tạo câu hỏi
                </Button>
              </Can>
            </Space>
          </Space>

          {importResult && (
            <Alert
              type={importResult.failed === 0 ? "success" : importResult.imported > 0 ? "warning" : "error"}
              closable
              onClose={() => setImportResult(null)}
              message={`Import: ${importResult.imported}/${importResult.total} thành công, ${importResult.failed} lỗi`}
              description={
                importResult.errors.length > 0 && (
                  <ul style={{ marginBottom: 0 }}>
                    {importResult.errors.map((e) => (
                      <li key={e.index}>
                        Dòng {e.index + 1}: {e.message}
                      </li>
                    ))}
                  </ul>
                )
              }
            />
          )}

          {isError && (
            <Alert
              type="error"
              message="Không thể tải danh sách câu hỏi"
              description={error?.message}
              action={
                <Button size="small" onClick={() => refetch()}>
                  Thử lại
                </Button>
              }
            />
          )}

          {isLoading && !data ? (
            <Skeleton active paragraph={{ rows: 5 }} />
          ) : (
            <QuizTable
              data={data?.items ?? []}
              loading={isLoading}
              pagination={{
                current: params.page,
                pageSize: params.pageSize,
                total: data?.total ?? 0,
              }}
              onChange={handleTableChange}
              onEdit={(q) => {
                setEditingQuestion(q);
                setFormOpen(true);
              }}
              onDelete={handleDelete}
              onAnalyzeDifficulty={(q) => setDifficultyQuestion(q)}
            />
          )}

          {!isLoading && !isError && data?.items.length === 0 && (
            <Empty
              description={hasFilters ? "Không tìm thấy câu hỏi phù hợp" : "Chưa có câu hỏi nào"}
            >
              {hasFilters && (
                <Button
                  onClick={() => setSearchParams(buildSearchParams({ page: 1, pageSize: DEFAULT_PAGE_SIZE }))}
                >
                  Xoá filter
                </Button>
              )}
            </Empty>
          )}
        </Space>
      </Card>

      <QuizFormModal
        open={formOpen}
        question={editingQuestion}
        onClose={() => {
          setFormOpen(false);
          setEditingQuestion(null);
        }}
        onSubmit={handleSubmit}
        isSubmitting={createQuestion.isPending || updateQuestion.isPending}
      />

      <AiExamGenerateModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onInsert={handleAiInsert}
        inserting={importQuestions.isPending}
      />

      <AiDifficultyDrawer
        open={difficultyQuestion !== null}
        quizId={difficultyQuestion?.id ?? null}
        questionLabel={difficultyQuestion?.content}
        onClose={() => setDifficultyQuestion(null)}
      />
    </div>
  );
}
