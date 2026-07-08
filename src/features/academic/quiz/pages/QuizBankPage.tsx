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
import { PlusOutlined, ReloadOutlined, UploadOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import type { TableProps } from "antd";
import { Can } from "../../../../shared/permissions";
import type { QuizFilterFormValues, QuizListParams, QuizQuestion } from "../../types";
import {
  useCreateQuizQuestion,
  useDeleteQuizQuestion,
  useImportJob,
  useImportQuizQuestions,
  useQuizQuestions,
  useUpdateQuizQuestion,
} from "../api/quiz.api";
import { QuizFilters } from "../components/QuizFilters";
import { QuizFormModal } from "../components/QuizFormModal";
import { QuizTable } from "../components/QuizTable";
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
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [importJobId, setImportJobId] = useState<string | null>(null);

  const createQuestion = useCreateQuizQuestion();
  const updateQuestion = useUpdateQuizQuestion(editingQuestion?.id);
  const deleteQuestion = useDeleteQuizQuestion();
  const importQuestions = useImportQuizQuestions();
  const { data: importJob } = useImportJob(importJobId ?? undefined);

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
      title: "Xoá câu hỏi",
      content: (
        <>
          Xoá câu hỏi này có thể ảnh hưởng đến các quiz đang tham chiếu. Thao tác được ghi audit.
        </>
      ),
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () => {
        deleteQuestion.mutate(question.id, {
          onSuccess: () => message.success("Đã xoá câu hỏi"),
          onError: (err: Error) => message.error(err.message || "Xoá thất bại"),
        });
      },
    });
  };

  const handleUpload = (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    importQuestions.mutate(formData, {
      onSuccess: ({ jobId }) => {
        setImportJobId(jobId);
        message.success("Đã gửi file import");
      },
      onError: (err: Error) => message.error(err.message || "Import thất bại"),
    });
    return false;
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
                <Upload beforeUpload={handleUpload} showUploadList={false} accept=".csv,.xlsx">
                  <Button icon={<UploadOutlined />} loading={importQuestions.isPending}>
                    Import
                  </Button>
                </Upload>
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

          {importJob && (
            <Alert
              type={importJob.status === "completed" ? "success" : importJob.status === "failed" ? "error" : "info"}
              message={`Import: ${importJob.status}`}
              description={
                <>
                  <div>Đã import: {importJob.imported ?? 0}</div>
                  {importJob.errors && importJob.errors.length > 0 && (
                    <ul>
                      {importJob.errors.map((e) => (
                        <li key={e.row}>
                          Dòng {e.row}: {e.message}
                        </li>
                      ))}
                    </ul>
                  )}
                  {importJob.failedReason && <div>{importJob.failedReason}</div>}
                </>
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
    </div>
  );
}
