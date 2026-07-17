// Trang "Trợ lý AI" của giảng viên/mentor (design admin-lecturer-ai-assist §4).
//
// 3 tab, mỗi tab gọi 1 endpoint mentor SYNC (POST /ai/mentor/*) rồi render markdown + model:
//   - Student brief   : studentAlias (alias, KHÔNG PII) + signals tự do → tóm tắt tình hình học viên.
//   - Feedback assist : submission + rubric + tone → NHÁP nhận xét; CHỈ có nút Copy, KHÔNG auto-gửi
//                       cho học viên (mentor-in-the-loop).
//   - Cohort insight  : cohort mô tả + metrics tự do → phân tích cả lớp.
//
// 3 endpoint là PASS-THROUGH: mentor tự dựng payload (signals/submission/metrics) từ dữ liệu họ đã
// có quyền xem — trang không tự fetch dữ liệu học viên (khớp MentorController BE, schema dùng alias).
// Gate ai.teacher.use ở tầng route (routeRegistry requiredPermissions); nav cũng gate cùng leaf.

import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { CopyOutlined, RobotOutlined, SendOutlined } from "@ant-design/icons";
import MDEditor from "@uiw/react-md-editor";
import rehypeSanitize from "rehype-sanitize";
import { ApiError } from "../../../../shared/api/client";
import { readDifficultyResult } from "../lib/difficultyResult";
import { parseFreeSignal } from "../lib/mentorPayload";
import {
  useMentorCohortInsight,
  useMentorFeedbackAssist,
  useMentorStudentBrief,
} from "../hooks/useMentor";
import type { MentorResult } from "../types";

const LANGUAGE_OPTIONS = [
  { label: "Tiếng Việt", value: "vi" },
  { label: "English", value: "en" },
];

/** Map lỗi mentor → message tiếng Việt. 400 AI_MENTOR_INVALID = input rỗng/quá dài; 403 = thiếu quyền. */
function mentorErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 403) {
      return "Bạn không có quyền dùng trợ lý mentor (cần quyền ai.teacher.use).";
    }
    if (err.code === 400) {
      return err.errorCode === "AI_MENTOR_INVALID"
        ? "Dữ liệu nhập chưa hợp lệ (thiếu trường bắt buộc hoặc quá dài)."
        : err.message;
    }
    return err.message || "Không tạo được kết quả. Vui lòng thử lại.";
  }
  return "Không tạo được kết quả. Vui lòng thử lại.";
}

/** Vùng hiển thị kết quả sync: loading / lỗi / markdown + model. `onCopy` bật nút Copy (feedback). */
function MentorResultPanel({
  isPending,
  error,
  data,
  showCopy = false,
}: {
  isPending: boolean;
  error: unknown;
  data: MentorResult | undefined;
  showCopy?: boolean;
}) {
  if (isPending) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <Spin />
        <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
          AI đang xử lý…
        </Typography.Paragraph>
      </div>
    );
  }

  if (error) {
    return <Alert type="error" showIcon message={mentorErrorMessage(error)} />;
  }

  if (!data) return null;

  const view = readDifficultyResult(data);
  if (!view.markdown.trim()) {
    return <Empty description="AI không trả về nội dung. Thử điều chỉnh đầu vào và gửi lại." />;
  }

  const handleCopy = () => {
    navigator.clipboard
      .writeText(view.markdown)
      .then(() => message.success("Đã sao chép nháp nhận xét"))
      .catch(() => message.error("Không sao chép được — hãy bôi đen và copy thủ công."));
  };

  return (
    <div>
      <Space size="small" style={{ marginBottom: 12 }} wrap>
        {view.model && <Tag color="blue">Model: {view.model}</Tag>}
        {showCopy && (
          <Button size="small" icon={<CopyOutlined />} onClick={handleCopy}>
            Sao chép nháp
          </Button>
        )}
      </Space>
      <div data-color-mode="light">
        <MDEditor.Markdown
          source={view.markdown}
          rehypePlugins={[[rehypeSanitize]]}
          style={{ background: "transparent" }}
        />
      </div>
      {showCopy && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, fontSize: 12 }}>
          Đây là bản nháp để bạn tham khảo — chỉnh sửa rồi tự gửi cho học viên. Hệ thống KHÔNG tự
          gửi.
        </Typography.Paragraph>
      )}
    </div>
  );
}

// --- Tab 1: Student brief ---

function StudentBriefTab() {
  const [form] = Form.useForm();
  const mutation = useMentorStudentBrief();

  const onFinish = (values: { studentAlias: string; signals?: string; language?: string }) => {
    mutation.mutate({
      studentAlias: values.studentAlias.trim(),
      signals: parseFreeSignal(values.signals),
      language: values.language,
    });
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <Typography.Paragraph type="secondary">
        Tóm tắt tình hình một học viên (điểm mạnh / rủi ro / việc nên làm) từ tín hiệu bạn cung cấp.
        Dùng <b>alias</b>, không nhập thông tin định danh (tên thật, email, SĐT).
      </Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={onFinish} disabled={mutation.isPending}>
        <Form.Item
          name="studentAlias"
          label="Alias học viên"
          rules={[{ required: true, message: "Nhập alias học viên (không dùng PII)" }]}
        >
          <Input placeholder="VD: HV-042 hoặc biệt danh nhóm" maxLength={2048} />
        </Form.Item>
        <Form.Item
          name="signals"
          label="Tín hiệu / dữ kiện"
          tooltip="Điểm số, mức độ tham gia, bài đã nộp… Gõ văn bản thường hoặc JSON đều được."
        >
          <Input.TextArea
            rows={6}
            placeholder={
              "VD:\n- Điểm quiz gần nhất: 4/10\n- Vắng 2 buổi liên tiếp\n- Chưa nộp bài tập tuần 3"
            }
          />
        </Form.Item>
        <Form.Item name="language" label="Ngôn ngữ kết quả" initialValue="vi">
          <Select options={LANGUAGE_OPTIONS} style={{ maxWidth: 200 }} />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SendOutlined />}
            loading={mutation.isPending}
          >
            Tạo tóm tắt
          </Button>
        </Form.Item>
      </Form>
      <MentorResultPanel
        isPending={mutation.isPending}
        error={mutation.error}
        data={mutation.data}
      />
    </div>
  );
}

// --- Tab 2: Feedback assist ---

function FeedbackAssistTab() {
  const [form] = Form.useForm();
  const mutation = useMentorFeedbackAssist();

  const onFinish = (values: {
    submission: string;
    rubric?: string;
    tone?: string;
    language?: string;
  }) => {
    mutation.mutate({
      submission: values.submission,
      rubric: values.rubric?.trim() || undefined,
      tone: values.tone?.trim() || undefined,
      language: values.language,
    });
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <Typography.Paragraph type="secondary">
        Nháp nhận xét cho một bài nộp theo rubric và tông giọng bạn chọn. Kết quả chỉ để <b>tham
        khảo và sao chép</b> — không tự gửi cho học viên.
      </Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={onFinish} disabled={mutation.isPending}>
        <Form.Item
          name="submission"
          label="Nội dung bài nộp / ngữ cảnh"
          rules={[{ required: true, message: "Dán nội dung bài nộp cần nhận xét" }]}
        >
          <Input.TextArea rows={8} placeholder="Dán bài nộp của học viên tại đây…" maxLength={200000} />
        </Form.Item>
        <Form.Item name="rubric" label="Rubric / tiêu chí (tuỳ chọn)">
          <Input.TextArea rows={4} placeholder="VD: Đúng yêu cầu đề bài, code sạch, có test…" />
        </Form.Item>
        <Space size="large" wrap>
          <Form.Item name="tone" label="Tông giọng (tuỳ chọn)">
            <Input placeholder="VD: khích lệ, thẳng thắn, chi tiết" style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="language" label="Ngôn ngữ kết quả" initialValue="vi">
            <Select options={LANGUAGE_OPTIONS} style={{ width: 200 }} />
          </Form.Item>
        </Space>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SendOutlined />}
            loading={mutation.isPending}
          >
            Tạo nháp nhận xét
          </Button>
        </Form.Item>
      </Form>
      <MentorResultPanel
        isPending={mutation.isPending}
        error={mutation.error}
        data={mutation.data}
        showCopy
      />
    </div>
  );
}

// --- Tab 3: Cohort insight ---

function CohortInsightTab() {
  const [form] = Form.useForm();
  const mutation = useMentorCohortInsight();

  const onFinish = (values: { cohort: string; metrics?: string; language?: string }) => {
    mutation.mutate({
      cohort: values.cohort.trim(),
      metrics: parseFreeSignal(values.metrics),
      language: values.language,
    });
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <Typography.Paragraph type="secondary">
        Phân tích tổng quan cả nhóm/lớp từ số liệu bạn cung cấp (tỉ lệ hoàn thành, phân bố điểm, mức
        tham gia…).
      </Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={onFinish} disabled={mutation.isPending}>
        <Form.Item
          name="cohort"
          label="Mô tả nhóm / lớp"
          rules={[{ required: true, message: "Mô tả nhóm/lớp cần phân tích" }]}
        >
          <Input.TextArea rows={3} placeholder="VD: Lớp Java K18 — 32 học viên, tuần 5/12" maxLength={2048} />
        </Form.Item>
        <Form.Item
          name="metrics"
          label="Số liệu"
          tooltip="Gõ văn bản thường hoặc JSON đều được."
        >
          <Input.TextArea
            rows={6}
            placeholder={
              "VD:\n- Hoàn thành bài tập: 68%\n- Điểm TB quiz: 7.2\n- 5 học viên rủi ro bỏ học"
            }
          />
        </Form.Item>
        <Form.Item name="language" label="Ngôn ngữ kết quả" initialValue="vi">
          <Select options={LANGUAGE_OPTIONS} style={{ maxWidth: 200 }} />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SendOutlined />}
            loading={mutation.isPending}
          >
            Phân tích lớp
          </Button>
        </Form.Item>
      </Form>
      <MentorResultPanel
        isPending={mutation.isPending}
        error={mutation.error}
        data={mutation.data}
      />
    </div>
  );
}

export default function MentorConsolePage() {
  const [activeKey, setActiveKey] = useState("student-brief");

  return (
    <div>
      <Typography.Title level={3}>
        <Space>
          <RobotOutlined />
          Trợ lý AI
        </Space>
      </Typography.Title>
      <Card>
        <Tabs
          activeKey={activeKey}
          onChange={setActiveKey}
          destroyInactiveTabPane
          items={[
            { key: "student-brief", label: "Tóm tắt học viên", children: <StudentBriefTab /> },
            { key: "feedback-assist", label: "Nháp nhận xét", children: <FeedbackAssistTab /> },
            { key: "cohort-insight", label: "Phân tích lớp", children: <CohortInsightTab /> },
          ]}
        />
      </Card>
    </div>
  );
}
