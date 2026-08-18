import { useState } from "react";
import { Alert, Button, Card, Empty, Space, Table, Tag, Typography, message } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Can } from "../../../shared/permissions";
import { DeleteConfirmModal } from "../../../shared/components/DeleteConfirmModal";
import {
  useActivateXpMultiplierEvent,
  useDeactivateXpMultiplierEvent,
  useXpMultiplierEvents,
} from "../api/gamification.api";
import type { XpMultiplierEvent } from "../api/gamification.api";
import { XpMultiplierEventFormModal } from "../components/XpMultiplierEventFormModal";

/** Trạng thái hiển thị của một sự kiện — GỘP cờ bật/tắt với khung thời gian. */
export type EventStatus = "OFF" | "SCHEDULED" | "RUNNING" | "EXPIRED";

/**
 * Trạng thái thật của sự kiện tại thời điểm `now`.
 *
 * <p>Chỉ hiện cờ `active` là không đủ và dễ gây hiểu nhầm chết người: một sự kiện `active = true`
 * có thể CHƯA tới giờ (chưa nhân XP của ai) hoặc ĐÃ hết khung (cũng không nhân nữa). Người vận hành
 * nhìn thấy "Đang bật" ở cả ba ca sẽ tưởng sự kiện đang chảy XP trong khi không, hoặc ngược lại đi
 * tắt một thứ vốn đã tự hết.
 *
 * Pure — unit test.
 */
export function eventStatus(
  event: Pick<XpMultiplierEvent, "active" | "startsAt" | "endsAt">,
  now: Date = new Date()
): EventStatus {
  if (!event.active) return "OFF";
  const t = now.getTime();
  if (t < new Date(event.startsAt).getTime()) return "SCHEDULED";
  if (t >= new Date(event.endsAt).getTime()) return "EXPIRED";
  return "RUNNING";
}

const STATUS_LABEL: Record<EventStatus, { text: string; color: string }> = {
  OFF: { text: "Tắt", color: "default" },
  SCHEDULED: { text: "Đã bật — chờ tới giờ", color: "blue" },
  RUNNING: { text: "ĐANG NHÂN XP", color: "green" },
  EXPIRED: { text: "Đã hết khung", color: "orange" },
};

/**
 * Có bật được không: chưa bật VÀ khung chưa trôi qua hết. BE cũng từ chối cả hai ca — chặn ở đây
 * chỉ để nút không mời người ta bấm vào chỗ chắc chắn lỗi. Pure — unit test.
 */
export function canActivate(
  event: Pick<XpMultiplierEvent, "active" | "endsAt">,
  now: Date = new Date()
): boolean {
  return !event.active && new Date(event.endsAt).getTime() > now.getTime();
}

/** Sự kiện đang BẬT thì khoá sửa — đổi hệ số giữa chừng làm nửa ngày ghi theo luật khác. */
export function canEdit(event: Pick<XpMultiplierEvent, "active">): boolean {
  return !event.active;
}

export function formatInstant(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

/**
 * Câu tóm tắt hiện trong hộp xác nhận BẬT — phải nêu RÕ hệ số VÀ khung thời gian.
 *
 * <p>Đây là nội dung của ràng buộc "xác nhận trước khi bật", không phải trang trí: người bấm phải
 * đọc thấy đúng con số sắp có hiệu lực. Nhận `format` để test ghim được nội dung mà không phụ thuộc
 * locale của máy chạy test. Pure — unit test.
 */
export function activationSummary(
  event: Pick<XpMultiplierEvent, "multiplier" | "startsAt" | "endsAt">,
  format: (iso: string) => string = formatInstant
): string {
  return `Hệ số x${event.multiplier} · từ ${format(event.startsAt)} đến ${format(event.endsAt)}`;
}

export default function XpMultiplierEventsPage() {
  const { data, isLoading, isError, error, refetch } = useXpMultiplierEvents();
  const activate = useActivateXpMultiplierEvent();
  const deactivate = useDeactivateXpMultiplierEvent();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<XpMultiplierEvent | null>(null);
  const [activating, setActivating] = useState<XpMultiplierEvent | null>(null);
  const [deactivating, setDeactivating] = useState<XpMultiplierEvent | null>(null);

  const events = data?.events ?? [];
  const maxMultiplier = data?.maxMultiplier ?? 5;

  const columns: TableProps<XpMultiplierEvent>["columns"] = [
    { title: "Mã", dataIndex: "code", fixed: "left", width: 170 },
    { title: "Tên", dataIndex: "title", width: 220 },
    {
      title: "Hệ số",
      dataIndex: "multiplier",
      width: 100,
      render: (m: number) => <Tag color="purple">x{m}</Tag>,
    },
    { title: "Bắt đầu", dataIndex: "startsAt", width: 190, render: formatInstant },
    { title: "Kết thúc", dataIndex: "endsAt", width: 190, render: formatInstant },
    {
      title: "Trạng thái",
      width: 190,
      render: (_: unknown, record: XpMultiplierEvent) => {
        const s = STATUS_LABEL[eventStatus(record)];
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: "Thao tác",
      fixed: "right",
      width: 230,
      render: (_: unknown, record: XpMultiplierEvent) => (
        <Can permissions={["gamification.admin.manage"]}>
          <Space size={4}>
            <Button
              size="small"
              disabled={!canEdit(record)}
              onClick={() => {
                setEditing(record);
                setFormOpen(true);
              }}
            >
              Sửa
            </Button>
            {record.active ? (
              <Button
                size="small"
                danger
                loading={deactivate.isPending && deactivate.variables?.code === record.code}
                onClick={() => setDeactivating(record)}
              >
                Tắt
              </Button>
            ) : (
              <Button
                size="small"
                type="primary"
                disabled={!canActivate(record)}
                loading={activate.isPending && activate.variables?.code === record.code}
                onClick={() => setActivating(record)}
              >
                Bật
              </Button>
            )}
          </Space>
        </Can>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Sự kiện nhân hệ số XP</Typography.Title>
      <Typography.Paragraph type="secondary">
        Đặt hệ số và khung thời gian cho đợt "cày quest nhân hệ số". Trong khung, XP được nhân{" "}
        <strong>ngay lúc cộng</strong> và hệ số được ghi vào từng dòng sổ XP, đồng thời{" "}
        <strong>trần XP mỗi ngày cũng được nhân theo</strong> nên người cày không chạm trần sớm gấp
        đôi. Trần hệ số hiện tại: <strong>x{maxMultiplier}</strong>.
      </Typography.Paragraph>

      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="XP đã cấp không rút lại được"
        description="Sổ XP chỉ ghi thêm, không sửa. Tắt sự kiện chỉ dừng nhân từ lúc đó — phần XP đã cộng vẫn nằm trong tổng XP, level và bảng xếp hạng mùa."
      />

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Làm mới
          </Button>
          <Can permissions={["gamification.admin.manage"]}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Tạo sự kiện
            </Button>
          </Can>
        </Space>
      </Card>

      {isError && (
        <Alert
          type="error"
          message="Không thể tải danh sách sự kiện"
          description={error?.message}
          action={
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Thử lại
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={events}
        loading={isLoading}
        pagination={false}
        scroll={{ x: 1120 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Chưa có sự kiện nhân hệ số nào."
            />
          ),
        }}
      />

      <XpMultiplierEventFormModal
        open={formOpen}
        event={editing}
        maxMultiplier={maxMultiplier}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />

      {/*
        Tái dùng DeleteConfirmModal (không chế modal mới): thứ nó cung cấp là "chặn một hành động
        KHÔNG HOÀN TÁC ĐƯỢC + bắt nhập lý do đi vào audit", còn "xoá" chỉ là ca đầu tiên cần nó.
        Bật sự kiện đúng là ca thứ hai — và BE cũng đòi `reason`.
      */}
      <DeleteConfirmModal
        open={!!activating}
        title={`Bật sự kiện ${activating?.code ?? ""}?`}
        okText="Bật sự kiện"
        reasonLabel="Lý do bật (ghi audit log)"
        reasonPlaceholder="VD: chạy đợt khuyến khích học đầu kỳ theo kế hoạch tháng 1"
        description={
          activating && (
            <>
              Sắp có hiệu lực: <strong>{activationSummary(activating)}</strong>.
              <br />
              XP nhân ra sẽ nằm <strong>vĩnh viễn</strong> trong sổ XP, tổng XP, level và bảng xếp
              hạng mùa. Tắt sự kiện chỉ dừng nhân từ lúc tắt, <strong>không hoàn tác được</strong>{" "}
              phần đã cộng.
            </>
          )
        }
        loading={activate.isPending}
        onConfirm={(reason) => {
          if (!activating) return;
          activate.mutate(
            {
              code: activating.code,
              // Nhắc lại ĐÚNG giá trị đang hiện trên màn hình: BE so với bản đang lưu và từ chối
              // nếu lệch. Đó là cách bắt được ca "màn hình mở từ hôm qua, người khác đã sửa x2 → x5".
              confirm: {
                confirmMultiplier: activating.multiplier,
                confirmStartsAt: activating.startsAt,
                confirmEndsAt: activating.endsAt,
                reason,
              },
            },
            {
              onSuccess: () => {
                message.success("Đã bật sự kiện nhân hệ số");
                setActivating(null);
              },
            }
          );
        }}
        onCancel={() => setActivating(null)}
      />

      <DeleteConfirmModal
        open={!!deactivating}
        title={`Tắt sự kiện ${deactivating?.code ?? ""}?`}
        okText="Tắt sự kiện"
        reasonLabel="Lý do tắt (ghi audit log)"
        reasonPlaceholder="VD: đặt nhầm hệ số, dừng sớm theo yêu cầu"
        description={
          <>
            Từ lúc tắt, XP trở lại hệ số x1. Phần XP đã nhân trước đó{" "}
            <strong>vẫn giữ nguyên</strong> trong sổ.
          </>
        }
        loading={deactivate.isPending}
        onConfirm={(reason) => {
          if (!deactivating) return;
          deactivate.mutate(
            { code: deactivating.code, reason },
            {
              onSuccess: () => {
                message.success("Đã tắt sự kiện");
                setDeactivating(null);
              },
            }
          );
        }}
        onCancel={() => setDeactivating(null)}
      />
    </div>
  );
}
