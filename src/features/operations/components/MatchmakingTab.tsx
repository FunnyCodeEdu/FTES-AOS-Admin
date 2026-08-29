import { useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { ReloadOutlined, SendOutlined, ThunderboltOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { TableProps } from "antd";
import { Can } from "../../../shared/permissions";
import {
  useAutoBuildRooms,
  useCreateMatchmakingRoom,
  useEliminateMatchmakingMember,
  useInviteMatchmakingRoom,
  useMatchmakingProfiles,
  useMatchmakingResults,
  useMatchmakingRooms,
  useMatchmakingUnassigned,
  useRemoveMatchmakingMember,
  useScheduleMatchmakingRoom,
  type MatchmakingAdminProfile,
  type MatchmakingRoom,
  type MatchmakingRoomResult,
} from "../api/matchmaking.api";

/** Nhãn giới tính — bảng tra một chỗ, dùng cho cả danh sách lẫn thẻ người trong phòng. */
const GENDER_LABEL: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
};

const SEEKING_LABEL: Record<string, string> = {
  MALE: "Tìm nam",
  FEMALE: "Tìm nữ",
  ANY: "Ai cũng được",
};

/**
 * Bảng điều khiển chương trình ghép đôi ("Ghép đôi sinh viên FU") của ban tổ chức.
 *
 * <p>Ba khối theo đúng thứ tự công việc: <b>người đăng ký</b> → <b>phòng ghép</b> (dựng, đặt giờ +
 * link, gửi thư mời, loại người trên sóng) → <b>kết quả</b> để trao thưởng.
 *
 * <p>Chỉ hiện với sự kiện loại `matchmaking`; mọi thao tác gác bằng `event.manage`.
 */
export function MatchmakingTab({ eventId }: { eventId: string }) {
  const profiles = useMatchmakingProfiles(eventId);
  const unassigned = useMatchmakingUnassigned(eventId);
  const rooms = useMatchmakingRooms(eventId);
  const results = useMatchmakingResults(eventId);

  const autoBuild = useAutoBuildRooms();
  const createRoom = useCreateMatchmakingRoom();
  const [guestsPerRoom, setGuestsPerRoom] = useState<number>(3);

  const assignedCount = (profiles.data?.length ?? 0) - (unassigned.data?.length ?? 0);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {profiles.isError && (
        <Alert
          type="error"
          showIcon
          message="Không tải được danh sách người đăng ký"
          description={profiles.error?.message}
        />
      )}

      <Card
        title="Người đăng ký"
        extra={
          <Space>
            <Typography.Text type="secondary">
              {`${assignedCount}/${profiles.data?.length ?? 0} đã xếp phòng`}
            </Typography.Text>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                void profiles.refetch();
                void unassigned.refetch();
              }}
            >
              Làm mới
            </Button>
          </Space>
        }
      >
        <ProfileTable
          data={profiles.data ?? []}
          loading={profiles.isLoading}
          unassignedIds={new Set((unassigned.data ?? []).map((p) => p.userId))}
        />
      </Card>

      <Can
        permissions={["event.manage"]}
        fallback={<Alert type="warning" showIcon message="Bạn không có quyền dựng phòng" />}
      >
        <Card
          title="Phòng ghép"
          extra={
            <Space>
              {/* Số người phụ mỗi phòng: ban tổ chức tự chọn theo số đăng ký thực tế, không
                  hardcode — 20 người thì 1 chính + 3 phụ là vừa, 200 người thì khác hẳn. */}
              <Tooltip title="Số người chơi phụ mỗi phòng">
                <InputNumber
                  min={1}
                  max={20}
                  value={guestsPerRoom}
                  onChange={(v) => setGuestsPerRoom(v ?? 3)}
                  style={{ width: 72 }}
                />
              </Tooltip>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={autoBuild.isPending}
                disabled={(unassigned.data?.length ?? 0) === 0}
                onClick={() =>
                  autoBuild.mutate(
                    { eventId, guestsPerRoom },
                    {
                      onSuccess: (built) =>
                        message.success(
                          built.length > 0
                            ? `Đã dựng ${built.length} phòng`
                            : "Không dựng được phòng nào — xem lại danh sách chưa xếp",
                        ),
                    },
                  )
                }
              >
                Dựng phòng tự động
              </Button>
              <Button
                loading={createRoom.isPending}
                onClick={() => createRoom.mutate({ eventId })}
              >
                Tạo phòng trống
              </Button>
            </Space>
          }
        >
          {/* Nói rõ luật xếp, vì kết quả tự động trông "sai" nếu không biết: giới ÍT hơn làm
              người chơi chính. Không giải thích thì ban tổ chức tưởng bộ dựng bị lỗi. */}
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Giới có ÍT người hơn sẽ làm người chơi chính, và hệ tôn trọng mục “muốn ghép với ai” của từng người. Ai không hợp phòng nào vẫn nằm ở danh sách chưa xếp để bạn xếp tay."
          />
          {(rooms.data ?? []).length === 0 ? (
            <Empty description="Chưa có phòng nào" />
          ) : (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              {(rooms.data ?? []).map((room) => (
                <RoomCard key={room.id} eventId={eventId} room={room} />
              ))}
            </Space>
          )}
        </Card>
      </Can>

      <Card
        title="Kết quả"
        extra={<Button icon={<ReloadOutlined />} onClick={() => void results.refetch()}>Làm mới</Button>}
      >
        <ResultTable data={results.data ?? []} loading={results.isLoading} />
      </Card>
    </Space>
  );
}

/** Danh sách người đăng ký kèm liên lạc — bản chỉ ban tổ chức đọc được. */
function ProfileTable({
  data,
  loading,
  unassignedIds,
}: {
  data: MatchmakingAdminProfile[];
  loading: boolean;
  unassignedIds: Set<string>;
}) {
  const columns: TableProps<MatchmakingAdminProfile>["columns"] = [
    {
      title: "Ảnh",
      dataIndex: "photoUrl",
      width: 72,
      render: (url: string) => <Avatar size={48} src={url} shape="square" />,
    },
    { title: "Tên", dataIndex: "displayName" },
    {
      title: "Giới",
      dataIndex: "gender",
      render: (g: string) => GENDER_LABEL[g] ?? g,
    },
    {
      title: "Muốn ghép",
      dataIndex: "seeking",
      render: (s: string) => SEEKING_LABEL[s] ?? s,
    },
    { title: "Cơ sở", dataIndex: "campus" },
    { title: "Năm sinh", dataIndex: "birthYear" },
    { title: "Email", dataIndex: "contactEmail" },
    { title: "Điện thoại", dataIndex: "contactPhone" },
    {
      title: "Phòng",
      key: "assigned",
      render: (_, row) =>
        unassignedIds.has(row.userId) ? <Tag>Chưa xếp</Tag> : <Tag color="green">Đã xếp</Tag>,
    },
  ];
  return <Table rowKey="userId" columns={columns} dataSource={data} loading={loading} size="small" />;
}

/** Một phòng: đặt giờ + link, gửi thư mời, và loại người trên sóng. */
function RoomCard({ eventId, room }: { eventId: string; room: MatchmakingRoom }) {
  const schedule = useScheduleMatchmakingRoom();
  const invite = useInviteMatchmakingRoom();
  const eliminate = useEliminateMatchmakingMember();
  const removeMember = useRemoveMatchmakingMember();

  const [meetingUrl, setMeetingUrl] = useState(room.meetingUrl ?? "");
  // Giờ nhập dạng chữ để không kéo thêm phụ thuộc picker vào file này; gửi xuống dạng ISO.
  const [scheduledAt, setScheduledAt] = useState(
    room.scheduledAt ? dayjs(room.scheduledAt).format("YYYY-MM-DDTHH:mm") : "",
  );

  const alive = room.members.filter((m) => !m.eliminated);
  const canInvite = Boolean(room.scheduledAt) && Boolean(room.meetingUrl);

  return (
    <Card
      size="small"
      title={
        <Space>
          <Typography.Text strong>{`Phòng ${room.code}`}</Typography.Text>
          <Tag color={room.status === "DONE" ? "green" : room.status === "LIVE" ? "red" : "blue"}>
            {room.status}
          </Tag>
          <Typography.Text type="secondary">{`${alive.length} người còn lại`}</Typography.Text>
        </Space>
      }
      extra={
        <Tooltip
          title={canInvite ? undefined : "Phòng phải có ĐỦ giờ và link mới gửi thư mời được"}
        >
          <Button
            icon={<SendOutlined />}
            disabled={!canInvite}
            loading={invite.isPending}
            onClick={() =>
              invite.mutate(
                { eventId, roomId: room.id },
                { onSuccess: () => message.success("Đã gửi thư mời cho cả phòng") },
              )
            }
          >
            {room.status === "DRAFT" ? "Gửi thư mời" : "Gửi lại thư mời"}
          </Button>
        </Tooltip>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Space wrap>
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            style={{ width: 220 }}
          />
          {/* Link RIÊNG của phòng — KHÔNG phải link phát cho khán giả (cái đó ở tab Thông tin
              của sự kiện). Gửi nhầm link khán giả cho người chơi là cả phòng ngồi xem chính
              mình; để link phòng lọt ra ngoài là khán giả tràn vào chỗ đang ghi hình. */}
          <Input
            placeholder="Link riêng của phòng (Meet/Zoom…)"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            style={{ width: 340 }}
          />
          <Button
            loading={schedule.isPending}
            onClick={() =>
              schedule.mutate(
                {
                  eventId,
                  roomId: room.id,
                  scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
                  meetingUrl: meetingUrl.trim() || null,
                },
                { onSuccess: () => message.success("Đã lưu giờ + link") },
              )
            }
          >
            Lưu
          </Button>
        </Space>

        {room.invitedAt ? (
          <Typography.Text type="secondary">
            {`Đã gửi thư mời lúc ${dayjs(room.invitedAt).format("DD/MM/YYYY HH:mm")}`}
          </Typography.Text>
        ) : null}

        <Space wrap size="middle">
          {room.members.map((m) => (
            <Card
              key={m.userId}
              size="small"
              style={{ width: 168, opacity: m.eliminated ? 0.45 : 1 }}
            >
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Space>
                  <Avatar src={m.profile?.photoUrl} shape="square" size={40} />
                  <div>
                    <Typography.Text strong ellipsis style={{ maxWidth: 96, display: "block" }}>
                      {m.profile?.displayName ?? "Người chơi"}
                    </Typography.Text>
                    {m.role === "HOST" ? <Tag color="magenta">Chính</Tag> : null}
                  </div>
                </Space>
                {m.role === "GUEST" && !m.eliminated ? (
                  <Space size={4}>
                    <Tooltip
                      title={
                        alive.length <= 2
                          ? "Còn hai người — đây là vòng chốt đôi, không loại tiếp"
                          : undefined
                      }
                    >
                      <Button
                        size="small"
                        danger
                        disabled={alive.length <= 2}
                        loading={eliminate.isPending}
                        onClick={() =>
                          eliminate.mutate({ eventId, roomId: room.id, userId: m.userId })
                        }
                      >
                        Loại
                      </Button>
                    </Tooltip>
                    <Popconfirm
                      title="Gỡ khỏi phòng?"
                      description="Người này quay lại danh sách chưa xếp."
                      onConfirm={() =>
                        removeMember.mutate({ eventId, roomId: room.id, userId: m.userId })
                      }
                    >
                      <Button size="small">Gỡ</Button>
                    </Popconfirm>
                  </Space>
                ) : null}
                {m.eliminated ? <Tag>Đã loại</Tag> : null}
              </Space>
            </Card>
          ))}
        </Space>
      </Space>
    </Card>
  );
}

/** Kết quả từng phòng — nguồn để trao thưởng. */
function ResultTable({ data, loading }: { data: MatchmakingRoomResult[]; loading: boolean }) {
  const columns: TableProps<MatchmakingRoomResult>["columns"] = [
    { title: "Phòng", dataIndex: "code", width: 96 },
    {
      title: "Hai người cuối",
      key: "finalists",
      render: (_, row) =>
        row.finalists.length === 0 ? (
          <Typography.Text type="secondary">—</Typography.Text>
        ) : (
          <Space>
            {row.finalists.map((f) => (
              <Space key={f.userId} size={4}>
                <Avatar size={24} src={f.photoUrl} />
                <span>{f.displayName}</span>
              </Space>
            ))}
          </Space>
        ),
    },
    {
      // Ba trạng thái, KHÔNG phải hai: "chưa chốt xong" khác hẳn "đã từ chối", và phần quà của
      // hai ca đó khác nhau (an ủi vs không có gì để trao vì chưa xong).
      title: "Kết quả",
      key: "matched",
      render: (_, row) =>
        row.matched ? (
          <Tag color="green">Thành đôi</Tag>
        ) : row.complete ? (
          <Tag>Không ghép</Tag>
        ) : (
          <Tag color="orange">Chưa chốt xong</Tag>
        ),
    },
  ];
  return <Table rowKey="roomId" columns={columns} dataSource={data} loading={loading} size="small" />;
}
