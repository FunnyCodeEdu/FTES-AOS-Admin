import { useEffect, useRef } from "react";
import {
  Alert,
  Button,
  Collapse,
  Divider,
  Drawer,
  Form,
  Modal,
  Skeleton,
  Space,
  Typography,
  message,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import { useChallengeTestCases, useUpsertChallengeTestCases } from "../api/exercises.api";
import type { ChallengeTestCaseView, ChallengeView } from "../types";
import {
  buildTestCaseItems,
  describeTestCaseCount,
  emptyTestCaseRow,
  TestCaseEditor,
  testCaseViewsToRows,
  type TestCaseRow,
} from "./TestCaseEditor";
import { TestCaseZipImport } from "./TestCaseZipImport";

/**
 * challenge-testcase-editor §2 — trình quản lý test case của MỘT challenge đã tạo.
 * Mở từ hàng challenge ở tab "Kho challenge" và từ `ChallengeEditModal`. Đọc
 * `GET /admin/challenges/{id}/test-cases` → sửa bằng `TestCaseEditor` → `PUT` (replace toàn bộ) →
 * invalidate. Đây là lỗ hổng lớn nhất trước change này: tạo xong KHÔNG có đường sửa test case.
 *
 * zIndex cao hơn Modal mặc định (1000) vì Drawer này có thể mở ĐÈ lên `ChallengeEditModal`.
 */

interface TestCaseFormValues {
  testCases?: TestCaseRow[];
}

interface TestCaseManagerDrawerProps {
  open: boolean;
  challenge: Pick<ChallengeView, "id" | "title" | "type"> | null;
  /** Chế độ chỉ đọc (không có quyền quản challenge). */
  disabled?: boolean;
  onClose: () => void;
  /** Gọi sau khi lưu thành công (caller refetch danh sách challenge nếu cần). */
  onSaved?: () => void;
}

export function TestCaseManagerDrawer({
  open,
  challenge,
  disabled,
  onClose,
  onSaved,
}: TestCaseManagerDrawerProps) {
  const [form] = Form.useForm<TestCaseFormValues>();
  const challengeId = challenge?.id;
  const query = useChallengeTestCases(challengeId, open);
  const upsert = useUpsertChallengeTestCases();

  /**
   * Đã có thao tác sửa trong form? Dùng để quyết định có được đè dữ liệu máy chủ lên form không:
   * lúc mới mở, cache cũ có thể tới TRƯỚC bản refetch — phải cho bản mới ghi đè; nhưng khi tác giả
   * đã gõ thì mọi refetch nền phải im lặng, tránh nuốt mất phần đang sửa dở.
   */
  const dirtyRef = useRef(false);
  useEffect(() => {
    if (!open || !challengeId) {
      dirtyRef.current = false;
      return;
    }
    if (!query.isSuccess || dirtyRef.current) return;
    form.setFieldsValue({ testCases: toFormRows(query.data) });
  }, [open, challengeId, query.isSuccess, query.data, form]);

  const reload = () => {
    query.refetch().then((res) => {
      dirtyRef.current = false;
      form.setFieldsValue({ testCases: toFormRows(res.data) });
      message.success("Đã tải lại test case từ máy chủ");
    });
  };

  const save = (rows: TestCaseRow[]) => {
    if (!challengeId) return;
    upsert.mutate(
      { id: challengeId, testCases: buildTestCaseItems(rows) },
      {
        onSuccess: () => {
          message.success(`Đã lưu ${rows.length} test case`);
          onSaved?.();
        },
        onError: handleAdminMutationError,
      }
    );
  };

  const handleFinish = (values: TestCaseFormValues) => {
    const rows = values.testCases ?? [];
    const counter = describeTestCaseCount(rows.length);
    if (counter.status === "over") {
      message.error(counter.text);
      return;
    }
    // Lưu danh sách RỖNG = xoá sạch test case của challenge (PUT là replace toàn bộ) — nguy hiểm,
    // bài sẽ mất chấm tự động → bắt xác nhận thay vì lặng lẽ xoá.
    if (rows.length === 0) {
      Modal.confirm({
        title: "Xoá toàn bộ test case?",
        content:
          "Lưu danh sách rỗng sẽ xoá hết test case của thử thách này — bài sẽ không còn chấm tự động được.",
        okText: "Xoá hết",
        okButtonProps: { danger: true },
        cancelText: "Huỷ",
        zIndex: 1200,
        onOk: () => save(rows),
      });
      return;
    }
    save(rows);
  };

  const notCode = Boolean(challenge && challenge.type !== "CODE");

  return (
    <Drawer
      title={challenge ? `Test case — ${challenge.title}` : "Test case"}
      width={900}
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
            disabled={disabled || !challengeId || query.isError}
          >
            Lưu test case
          </Button>
        </Space>
      }
    >
      {disabled && (
        <Alert
          type="warning"
          showIcon
          message="Chế độ chỉ đọc — không có quyền sửa test case."
          style={{ marginBottom: 16 }}
        />
      )}

      {notCode && (
        <Alert
          type="warning"
          showIcon
          message="Thử thách này không phải loại CODE"
          description="Test case chỉ dùng để chấm tự động cho thử thách CODE (bài thuật toán). Lưu ở đây sẽ không có tác dụng chấm điểm."
          style={{ marginBottom: 16 }}
        />
      )}

      {query.isError && (
        <Alert
          type="error"
          showIcon
          message="Không tải được test case"
          description="Endpoint đọc test case cần backend change `challenge-testcase-judge` (chưa deploy). Sau khi deploy, bấm Tải lại."
          action={
            <Button size="small" onClick={() => query.refetch()}>
              Tải lại
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {challengeId && (
        <Collapse
          size="small"
          style={{ marginBottom: 16 }}
          items={[
            {
              key: "zip",
              label: "Nhập hàng loạt từ tệp .zip (kiểu HackerRank)",
              children: (
                <TestCaseZipImport
                  challengeId={challengeId}
                  disabled={disabled}
                  onImported={reload}
                />
              ),
            },
          ]}
        />
      )}

      <Divider orientation="left">Danh sách test case</Divider>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        Lưu là <strong>thay thế toàn bộ</strong> danh sách test case hiện có của thử thách. Sửa xong
        nhớ bấm <strong>Lưu test case</strong>.
      </Typography.Paragraph>

      {query.isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          onValuesChange={() => {
            dirtyRef.current = true;
          }}
          disabled={disabled}
        >
          <TestCaseEditor disabled={disabled} />
        </Form>
      )}
    </Drawer>
  );
}

/** View BE → rows form; danh sách rỗng vẫn cho 1 hàng trắng để tác giả nhập ngay. */
function toFormRows(views: ChallengeTestCaseView[] | undefined): TestCaseRow[] {
  const rows = testCaseViewsToRows(views);
  return rows.length > 0 ? rows : [emptyTestCaseRow(0)];
}
