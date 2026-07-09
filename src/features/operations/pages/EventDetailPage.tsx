import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  QRCode,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { DownloadOutlined, PlayCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Can } from "../../../shared/permissions";
import {
  useCheckInQr,
  useEvent,
  useExportRegistrations,
  useIssueCertificates,
  useManualCheckIn,
  useRegistrations,
  useTransitionEvent,
  useUpdateRecording,
} from "../api/events.api";
import { EventCertificateModal } from "../components/EventCertificateModal";
import { EventTransitionModal } from "../components/EventTransitionModal";
import type { OfficialEventStatus, Registration } from "../shared/types";
import type { TableProps } from "antd";

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: event, isLoading, isError, error, refetch } = useEvent(eventId);
  const transition = useTransitionEvent();
  const updateRecording = useUpdateRecording();
  const issueCerts = useIssueCertificates();
  const manualCheckIn = useManualCheckIn();
  const exportCsv = useExportRegistrations(eventId);

  const [transitionOpen, setTransitionOpen] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<OfficialEventStatus | null>(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certCriteria, setCertCriteria] = useState<"attended" | "all">("attended");
  const { data: allRegistrations } = useRegistrations(eventId, { pageSize: 1000 });

  useEffect(() => {
    if (event?.recordingUrl) setRecordingUrl(event.recordingUrl);
  }, [event?.recordingUrl]);

  if (isLoading) return <Skeleton active paragraph={{ rows: 10 }} />;
  if (isError || !event) {
    return (
      <Alert
        type="error"
        message="Không thể tải chi tiết event"
        description={error?.message}
        action={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>Thử lại</Button>}
      />
    );
  }

  function openTransition(toStatus: OfficialEventStatus) {
    setTransitionTarget(toStatus);
    setTransitionOpen(true);
  }

  function handleTransition(reason?: string) {
    if (!transitionTarget) return;
    transition.mutate(
      { id: event!.id, toStatus: transitionTarget, reason },
      {
        onSuccess: () => {
          message.success("Đã cập nhật trạng thái event");
          setTransitionOpen(false);
          setTransitionTarget(null);
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  function handleSaveRecording() {
    updateRecording.mutate(
      { eventId: event!.id, recordingUrl },
      {
        onSuccess: () => message.success("Đã lưu recording"),
        onError: (err) => message.error(err.message),
      }
    );
  }

  function handleIssueCertificates(criteria: "attended" | "all", rewardPoints?: number) {
    issueCerts.mutate(
      { eventId: event!.id, criteria, rewardPoints },
      {
        onSuccess: (res) => {
          message.success(`Đã cấp ${res.issuedCount} certificate/reward`);
          setCertModalOpen(false);
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  const estimatedCertCount = useMemo(() => {
    const regs = allRegistrations?.items ?? [];
    if (certCriteria === "attended") return regs.filter((r: Registration) => r.checkedIn).length;
    return regs.length;
  }, [allRegistrations, certCriteria]);

  const isCompleted = event.status === "completed";

  const items = [
    {
      key: "overview",
      label: "Tổng quan",
      children: (
        <>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Tiêu đề">{event.title}</Descriptions.Item>
            <Descriptions.Item label="Loại">{event.type}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái"><Tag>{event.status}</Tag></Descriptions.Item>
            <Descriptions.Item label="Hình thức">{event.mode}</Descriptions.Item>
            <Descriptions.Item label="Bắt đầu">{dayjs(event.schedule.startAt).format("DD/MM/YYYY HH:mm")}</Descriptions.Item>
            <Descriptions.Item label="Kết thúc">{event.schedule.endAt ? dayjs(event.schedule.endAt).format("DD/MM/YYYY HH:mm") : "—"}</Descriptions.Item>
            <Descriptions.Item label="Sức chứa">{event.capacity ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Link/Địa điểm">{event.onlineLink || event.location || "—"}</Descriptions.Item>
            {event.cancelledReason && <Descriptions.Item label="Lý do huỷ">{event.cancelledReason}</Descriptions.Item>}
          </Descriptions>
          <Can permissions={["event.manage"]}>
            <Space style={{ marginTop: 16 }}>
              {event.status === "draft" && (
                <Button type="primary" onClick={() => openTransition("published")}>Publish</Button>
              )}
              {event.status === "published" && (
                <Button onClick={() => openTransition("ongoing")}>Start</Button>
              )}
              {event.status === "ongoing" && (
                <Button onClick={() => openTransition("completed")}>Complete</Button>
              )}
              {(event.status === "draft" || event.status === "published" || event.status === "ongoing") && (
                <Button danger onClick={() => openTransition("cancelled")}>Huỷ event</Button>
              )}
            </Space>
          </Can>
        </>
      ),
    },
    {
      key: "registrations",
      label: "Registrations",
      children: <RegistrationsTab eventId={event.id} onExport={exportCsv} />,
    },
    {
      key: "checkin",
      label: "Check-in",
      children: <CheckInTab eventId={event.id} onManualCheckIn={(userId) => manualCheckIn.mutate({ eventId: event.id, userId })} />,
    },
    {
      key: "recording",
      label: "Recording",
      children: (
        <Can permissions={["event.manage"]} fallback={<Alert type="warning" message="Bạn không có quyền chỉnh sửa recording" showIcon />}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Input
              placeholder="Recording URL"
              value={recordingUrl}
              onChange={(e) => setRecordingUrl(e.target.value)}
            />
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleSaveRecording} loading={updateRecording.isPending}>
              Lưu recording
            </Button>
            {event.recordingUrl && (
              <a href={event.recordingUrl} target="_blank" rel="noreferrer">
                Xem recording
              </a>
            )}
          </Space>
        </Can>
      ),
    },
    {
      key: "certificates",
      label: "Certificates & Rewards",
      children: (
        <Can permissions={["event.manage"]} fallback={<Alert type="warning" message="Bạn không có quyền cấp certificate" showIcon />}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Tooltip title={!isCompleted ? "Event chưa Completed — không thể cấp certificate" : undefined}>
              <Button
                type="primary"
                disabled={!isCompleted}
                onClick={() => setCertModalOpen(true)}
              >
                Cấp certificate/reward
              </Button>
            </Tooltip>
            {!isCompleted && <Typography.Text type="warning">Event phải ở trạng thái Completed để cấp certificate.</Typography.Text>}
          </Space>
        </Can>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>{event.title}</Typography.Title>
      <Tabs items={items} />

      <EventTransitionModal
        open={transitionOpen}
        eventTitle={event.title}
        toStatus={transitionTarget ?? "cancelled"}
        onClose={() => { setTransitionOpen(false); setTransitionTarget(null); }}
        onConfirm={handleTransition}
        confirmLoading={transition.isPending}
      />

      <EventCertificateModal
        open={certModalOpen}
        eventTitle={event.title}
        estimatedCount={estimatedCertCount}
        criteria={certCriteria}
        onCriteriaChange={setCertCriteria}
        onClose={() => setCertModalOpen(false)}
        onConfirm={handleIssueCertificates}
        confirmLoading={issueCerts.isPending}
      />
    </div>
  );
}

function RegistrationsTab({ eventId, onExport }: { eventId: string; onExport: () => void }) {
  const [search, setSearch] = useState("");
  const [checkedIn, setCheckedIn] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isError, error, refetch } = useRegistrations(eventId, { search, checkedIn, page, pageSize });

  const columns: TableProps<Registration>["columns"] = [
    { title: "User", dataIndex: "userName" },
    { title: "Email", dataIndex: "email" },
    { title: "Checked in", dataIndex: "checkedIn", render: (v: boolean) => (v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>) },
    { title: "Registered at", dataIndex: "registeredAt", render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm") },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Input placeholder="Tìm user/email" value={search} onChange={(e) => setSearch(e.target.value)} onPressEnter={() => setPage(1)} />
        <Select
          value={checkedIn === undefined ? "all" : String(checkedIn)}
          options={[
            { label: "Tất cả", value: "all" },
            { label: "Đã check-in", value: "true" },
            { label: "Chưa check-in", value: "false" },
          ]}
          onChange={(value) => setCheckedIn(value === "all" ? undefined : value === "true")}
          style={{ width: 160 }}
        />
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Làm mới</Button>
        <Button icon={<DownloadOutlined />} onClick={onExport}>Export CSV</Button>
      </Space>
      {isError && <Alert type="error" message="Không thể tải registrations" description={error?.message} />}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          onChange: (p) => setPage(p),
        }}
      />
    </>
  );
}

function CheckInTab({ eventId, onManualCheckIn }: { eventId: string; onManualCheckIn: (userId: string) => void }) {
  const { data: qr, isLoading: qrLoading, isError: qrError, error: qrErrorMsg, refetch: refetchQr } = useCheckInQr(eventId);
  const { data: regs } = useRegistrations(eventId, { pageSize: 100 });

  return (
    <Can permissions={["event.checkin.operate"]} fallback={<Alert type="warning" message="Bạn không có quyền check-in" showIcon />}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Card title="QR Check-in">
          {qrLoading && <Skeleton active paragraph={{ rows: 2 }} />}
          {qrError && <Alert type="error" message="Không thể tải QR" description={qrErrorMsg?.message} action={<Button onClick={() => refetchQr()}>Thử lại</Button>} />}
          {qr && <QRCode value={qr.qrToken} />}
        </Card>
        <Card title="Check-in thủ công">
          <Space wrap>
            {regs?.items.map((r) => (
              <Button key={r.id} disabled={r.checkedIn} onClick={() => onManualCheckIn(r.userId)}>
                {r.userName} {r.checkedIn ? "(đã check-in)" : ""}
              </Button>
            ))}
          </Space>
        </Card>
      </Space>
    </Can>
  );
}
