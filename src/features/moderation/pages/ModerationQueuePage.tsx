import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { EyeOutlined, ReloadOutlined, SearchOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Can } from "../../../shared/permissions";
import { useEscalateReport, useReports } from "../api/moderation.api";
import { useModerationScopes } from "../hooks/useModerationScopes";
import { ReportDetailDrawer } from "../components/ReportDetailDrawer";
import { ResolveReportModal } from "../components/ResolveReportModal";
import { ScopePicker } from "../components/ScopePicker";
import type { Report, ReportSeverity, ReportStatus, ReportTargetType } from "../../community/shared/types";
import type { TableProps } from "antd";

const TABS: { key: ReportTargetType; label: string }[] = [
  { key: "post", label: "Posts" },
  { key: "comment", label: "Comments" },
  { key: "resource", label: "Resources" },
];

const SEVERITY_OPTIONS: { label: string; value: ReportSeverity }[] = [
  { label: "Thấp", value: "low" },
  { label: "Trung bình", value: "medium" },
  { label: "Cao", value: "high" },
  { label: "Nghiêm trọng", value: "critical" },
];

const STATUS_OPTIONS: { label: string; value: ReportStatus }[] = [
  { label: "Chờ xử lý", value: "pending" },
  { label: "Đã xử lý", value: "resolved" },
  { label: "Đã escalate", value: "escalated" },
  { label: "Từ chối", value: "rejected" },
];

export default function ModerationQueuePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [escalateTarget, setEscalateTarget] = useState<Report | null>(null);
  const [escalateReason, setEscalateReason] = useState("");

  const { effectiveScopeId } = useModerationScopes();
  const activeTab = (searchParams.get("type") as ReportTargetType) ?? "post";
  const status = (searchParams.get("status") as ReportStatus | undefined) ?? undefined;
  const severity = (searchParams.get("severity") as ReportSeverity | undefined) ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);

  const { data, isLoading, isError, error, refetch } = useReports({
    type: activeTab,
    status,
    severity,
    scopeId: effectiveScopeId,
    search: searchParams.get("search") ?? undefined,
    page,
    pageSize,
  });
  const escalate = useEscalateReport();

  function updateParams(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    setSearchParams(params);
  }

  function openDetail(report: Report) {
    setSelectedReport(report);
    setDrawerOpen(true);
  }

  function openResolve(report: Report) {
    setSelectedReport(report);
    setResolveOpen(true);
  }

  function handleEscalate() {
    if (!escalateTarget) return;
    if (!escalateReason.trim()) {
      message.error("Vui lòng nhập lý do escalate");
      return;
    }
    escalate.mutate(
      { id: escalateTarget.id, reason: escalateReason.trim() },
      {
        onSuccess: () => {
          message.success("Đã escalate report");
          setEscalateTarget(null);
          setEscalateReason("");
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  const columns: TableProps<Report>["columns"] = [
    { title: "Nội dung", dataIndex: "targetTitle" },
    { title: "Loại", dataIndex: "targetType" },
    { title: "Mức độ", dataIndex: "severity", render: (s: ReportSeverity) => <Tag>{s}</Tag> },
    { title: "Trạng thái", dataIndex: "status", render: (s: ReportStatus) => <Tag>{s}</Tag> },
    { title: "Group", dataIndex: "groupName" },
    { title: "Ngày tạo", dataIndex: "createdAt", render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm") },
    {
      title: "Thao tác",
      render: (_: unknown, record: Report) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            Chi tiết
          </Button>
          <Can permissions={["report.handle"]}>
            <Button size="small" type="primary" onClick={() => openResolve(record)}>
              Xử lý
            </Button>
          </Can>
          <Can permissions={["report.handle"]}>
            <Button size="small" icon={<UploadOutlined />} onClick={() => { setEscalateTarget(record); setEscalateReason(""); }}>
              Escalate
            </Button>
          </Can>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Moderation Queue</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm nội dung"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => updateParams({ search: search || undefined, page: undefined })}
            style={{ width: 240 }}
          />
          <Select
            placeholder="Mức độ"
            allowClear
            value={severity}
            options={SEVERITY_OPTIONS}
            onChange={(value) => updateParams({ severity: value, page: undefined })}
            style={{ width: 140 }}
          />
          <Select
            placeholder="Trạng thái"
            allowClear
            value={status}
            options={STATUS_OPTIONS}
            onChange={(value) => updateParams({ status: value, page: undefined })}
            style={{ width: 140 }}
          />
          <ScopePicker />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Làm mới</Button>
        </Space>
      </Card>

      {isError && (
        <Alert
          type="error"
          message="Không thể tải queue"
          description={error?.message}
          action={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>Thử lại</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs
        activeKey={activeTab}
        onChange={(key) => updateParams({ type: key, page: undefined })}
        items={TABS.map((t) => ({ key: t.key, label: t.label }))}
      />

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          onChange: (p, ps) => updateParams({ page: p, pageSize: ps }),
        }}
      />

      <ReportDetailDrawer report={selectedReport} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <ResolveReportModal report={selectedReport} open={resolveOpen} onClose={() => setResolveOpen(false)} />

      {escalateTarget && (
        <Card title="Escalate report" style={{ marginTop: 16 }}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Text>
              Report: <strong>{escalateTarget.targetTitle}</strong>
            </Typography.Text>
            <Input.TextArea
              rows={3}
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              placeholder="Lý do escalate (bắt buộc)"
            />
            <Space>
              <Button type="primary" onClick={handleEscalate} loading={escalate.isPending}>
                Xác nhận escalate
              </Button>
              <Button onClick={() => setEscalateTarget(null)}>Huỷ</Button>
            </Space>
          </Space>
        </Card>
      )}
    </div>
  );
}
