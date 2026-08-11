import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
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
  useReviewEvent,
  useTransitionEvent,
  useUpdateEvent,
  useUpdateEventVenue,
  useUpdateRecording,
} from "../api/events.api";
import { EventCertificateModal } from "../components/EventCertificateModal";
import { EventTransitionModal } from "../components/EventTransitionModal";
import { EventWizardModal, toEventWizardValues, type EventWizardValues } from "../components/EventWizardModal";
import type { OfficialEventStatus, Registration } from "../shared/types";
import type { TableProps } from "antd";

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: event, isLoading, isError, error, refetch } = useEvent(eventId);
  const transition = useTransitionEvent();
  const updateEvent = useUpdateEvent();
  const updateVenue = useUpdateEventVenue();
  const updateRecording = useUpdateRecording();
  const issueCerts = useIssueCertificates();
  const manualCheckIn = useManualCheckIn();
  const review = useReviewEvent();
  const exportCsv = useExportRegistrations(eventId);

  const [transitionOpen, setTransitionOpen] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<OfficialEventStatus | null>(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [venueOpen, setVenueOpen] = useState(false);
  const [venueDraft, setVenueDraft] = useState("");
  const [certCriteria, setCertCriteria] = useState<"attended" | "all">("attended");
  const { data: allRegistrations } = useRegistrations(eventId, { pageSize: 1000 });

  useEffect(() => {
    if (event?.recordingUrl) setRecordingUrl(event.recordingUrl);
  }, [event?.recordingUrl]);

  // PHẢI nằm TRÊN mọi early return: lượt render đang tải thoát ở `if (isLoading)` bên dưới, nên nếu
  // useMemo đứng sau đó thì lượt có data gọi nhiều hook hơn lượt đang tải → React ném "Rendered more
  // hooks than during the previous render" và trang trắng ngay khi tải xong. Chỉ phụ thuộc
  // allRegistrations/certCriteria, không đụng `event`, nên dời lên đây là an toàn.
  const estimatedCertCount = useMemo(() => {
    const regs = allRegistrations?.items ?? [];
    if (certCriteria === "attended") return regs.filter((r: Registration) => r.checkedIn).length;
    return regs.length;
  }, [allRegistrations, certCriteria]);

  // Cùng lý do "trên mọi early return" như trên. Đây vừa là giá trị prefill của form sửa, vừa là MỐC
  // so sánh để PATCH chỉ mang field thực sự đổi — nên phải là MỘT object duy nhất, không dựng lại
  // tại chỗ ở hai nơi.
  const editInitial = useMemo(() => (event ? toEventWizardValues(event) : undefined), [event]);

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

  function handleUpdate(values: EventWizardValues) {
    if (!editInitial) return;
    updateEvent.mutate(
      { id: event!.id, next: values, previous: editInitial },
      {
        onSuccess: () => {
          message.success("Đã lưu thay đổi");
          setEditOpen(false);
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  function handleSaveVenue() {
    const venue = venueDraft.trim();
    if (!venue) return;
    updateVenue.mutate(
      { id: event!.id, venue },
      {
        onSuccess: () => {
          message.success("Đã đổi link/địa điểm — người đã đăng ký sẽ nhận thông báo");
          setVenueOpen(false);
        },
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

  // BE gọi trạng thái kết thúc là ENDED (EventEndProcessor), không phải tên cũ mà FE tự đặt.
  const isEnded = event.status === "ended";
  // EventService.cancel chỉ nhận DRAFT/PENDING_APPROVAL/PUBLISHED và từ chối khi startAt đã qua
  // ("Không thể huỷ sau khi sự kiện đã bắt đầu") — ONGOING KHÔNG huỷ được. Mirror đúng guard đó để
  // không hiện nút chỉ để nhận lỗi đỏ.
  const cancellableStatus =
    event.status === "draft" || event.status === "pending_approval" || event.status === "published";
  const startedAlready = !!event.schedule.startAt && dayjs(event.schedule.startAt).isBefore(dayjs());
  // Sửa TOÀN PHẦN khi sự kiện chưa đóng sổ. ENDED/CANCELLED là trạng thái cuối — BE cũng từ chối,
  // hiện nút ở đó chỉ để nhận lỗi đỏ.
  // Viết tách khỏi `cancellableStatus` dù hiện đang trùng tập: hai luật sản phẩm độc lập, gộp lại
  // thì mai kia sửa luật huỷ sẽ âm thầm đổi luôn luật sửa.
  const editableStatus =
    event.status === "draft" || event.status === "pending_approval" || event.status === "published";
  // Đang diễn ra: BE mở ĐÚNG một field `venue` (link họp hỏng giữa buổi là nhu cầu thật) và từ chối
  // mọi field khác bằng EVENT_ONGOING_VENUE_ONLY. Nên dùng ô riêng một field thay vì mở cả wizard —
  // wizard cho sửa giờ/sức chứa/loại, bấm Lưu là ăn 400 dù người dùng chỉ định đổi link.
  const venueOnlyEditable = event.status === "ongoing";

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
          {/*
            Chỉ phơi ĐÚNG hai hành động admin có thật trên lifecycle: submit-duyệt và huỷ ("Sửa"
            nằm cùng khối vì cùng gate `event.manage`, nhưng không phải chuyển trạng thái).
            Nút "Start"/"Complete" cũ là mã chết — useTransitionEvent ném "Transition sang ... không
            được hỗ trợ (chỉ submit/cancel)" nên bấm vào chỉ nhận lỗi đỏ; ONGOING/ENDED do scheduler
            BE (EventEndProcessor) chuyển, không phải thao tác admin.
            Nhãn là "Gửi duyệt" chứ không phải "Publish": endpoint thật là POST /submit, đưa event
            sang PENDING_APPROVAL chứ không publish thẳng (EventService.submit).
          */}
          <Can permissions={["event.manage"]}>
            <Space style={{ marginTop: 16 }}>
              {event.status === "draft" && (
                <Button type="primary" onClick={() => openTransition("published")}>Gửi duyệt</Button>
              )}
              {/* Sự kiện đã ENDED/CANCELLED không sửa được — không render nút thay vì render rồi báo lỗi. */}
              {editableStatus && <Button onClick={() => setEditOpen(true)}>Sửa</Button>}
              {venueOnlyEditable && (
                <Button
                  onClick={() => {
                    setVenueDraft(event.onlineLink || event.location || "");
                    setVenueOpen(true);
                  }}
                >
                  Đổi link/địa điểm
                </Button>
              )}
              {cancellableStatus && (
                <Tooltip title={startedAlready ? "Sự kiện đã bắt đầu — không thể huỷ" : undefined}>
                  <Button danger disabled={startedAlready} onClick={() => openTransition("cancelled")}>
                    Huỷ event
                  </Button>
                </Tooltip>
              )}
            </Space>
          </Can>
          {/*
            Mắt xích CUỐI của vòng đời: /submit mới chỉ đưa event lên PENDING_APPROVAL. Duyệt nằm ở
            module admin nên gate bằng `admin.event.manage` (KHÁC `event.manage` của submit/cancel) —
            đúng ý đồ tách bạch "người tạo" với "người duyệt", vì thế để riêng khối <Can> chứ không
            gộp vào khối trên.
          */}
          {event.status === "pending_approval" && (
            <Can
              permissions={["admin.event.manage"]}
              fallback={
                <Alert
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                  message="Event đang chờ duyệt — bạn không có quyền duyệt"
                />
              }
            >
              <Space style={{ marginTop: 16 }}>
                <Button
                  type="primary"
                  loading={review.isPending}
                  onClick={() =>
                    review.mutate(
                      { id: event.id, decision: "APPROVE" },
                      { onSuccess: () => message.success("Đã duyệt — event chuyển sang PUBLISHED") }
                    )
                  }
                >
                  Duyệt
                </Button>
              </Space>
            </Can>
          )}
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
            <Tooltip title={!isEnded ? "Event chưa kết thúc (ENDED) — không thể cấp certificate" : undefined}>
              <Button
                type="primary"
                disabled={!isEnded}
                onClick={() => setCertModalOpen(true)}
              >
                Cấp certificate/reward
              </Button>
            </Tooltip>
            {!isEnded && <Typography.Text type="warning">Event phải đã kết thúc (ENDED) để cấp certificate.</Typography.Text>}
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

      {/* Cùng một wizard với đường tạo, chỉ khác: có `initial` ⇒ chế độ sửa (prefill + đổi nhãn). */}
      <EventWizardModal
        open={editOpen}
        initial={editInitial}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        confirmLoading={updateEvent.isPending}
      />

      {/*
        Ô riêng MỘT field cho sự kiện đang diễn ra. Không mở EventWizardModal ở đây: wizard cho sửa
        cả giờ/sức chứa/loại, mà BE từ chối mọi field ngoài `venue` khi ONGOING — người dùng sẽ bấm
        Lưu rồi ăn 400 dù chỉ định đổi link.
      */}
      <Modal
        open={venueOpen}
        title="Đổi link/địa điểm"
        okText="Lưu"
        cancelText="Huỷ"
        confirmLoading={updateVenue.isPending}
        onOk={handleSaveVenue}
        onCancel={() => setVenueOpen(false)}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary">
          Sự kiện đang diễn ra nên chỉ đổi được link/địa điểm. Người đã đăng ký sẽ nhận thông báo kèm
          thông tin mới.
        </Typography.Paragraph>
        <Input
          value={venueDraft}
          onChange={(e) => setVenueDraft(e.target.value)}
          placeholder="Link họp hoặc địa điểm"
        />
      </Modal>

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
