import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { PlusOutlined, ReloadOutlined, WarningOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Can } from "../../../shared/permissions";
import { useQuests, usePatchQuest } from "../api/gamification.api";
import type { Quest, QuestPatchRequest } from "../api/gamification.api";
import { QuestFormModal } from "../components/QuestFormModal";

const COIN_MIN = 50;
const COIN_MAX = 100;

interface EditableNumberCellProps {
  value: number;
  min: number;
  disabled?: boolean;
  warn?: (v: number) => boolean;
  onCommit: (next: number, revert: () => void) => void;
}

/** Ô InputNumber sửa tại chỗ: commit khi blur/Enter và chỉ khi giá trị đổi. */
function EditableNumberCell({ value, min, disabled, warn, onCommit }: EditableNumberCellProps) {
  const [draft, setDraft] = useState<number | null>(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit() {
    if (draft === null || draft === value) {
      setDraft(value);
      return;
    }
    // revert: BE từ chối (vd rewardCoin ngoài [1,1000]) → giá trị primitive không đổi nên
    // useEffect không tự reset; revert đưa ô về giá trị đã lưu.
    onCommit(draft, () => setDraft(value));
  }

  const showWarn = warn && draft !== null && warn(draft);

  return (
    <Space size={4}>
      <InputNumber
        size="small"
        min={min}
        value={draft}
        disabled={disabled}
        status={showWarn ? "warning" : undefined}
        onChange={(v) => setDraft(v)}
        onBlur={commit}
        onPressEnter={commit}
        style={{ width: 84 }}
      />
      {showWarn && (
        <Tooltip title={`Nên trong khoảng ${COIN_MIN}–${COIN_MAX} xu theo hướng dẫn kinh tế`}>
          <WarningOutlined style={{ color: "#faad14" }} />
        </Tooltip>
      )}
    </Space>
  );
}

export default function QuestsPage() {
  const { data, isLoading, isError, error, refetch } = useQuests();
  const patchQuest = usePatchQuest();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Quest | null>(null);

  // Inline edit / toggle gửi PATCH bán phần theo `code` — CHỈ field bị đổi, KHÔNG gửi lại toàn bộ
  // record (POST upsert) → tránh clobber (last-writer-wins cả bản ghi) khi 2 admin sửa song song.
  // QuestFormModal (tạo/sửa đủ field) vẫn dùng POST upsert vì cần tạo mới (PATCH 404 nếu chưa có).
  function commitField(
    quest: Quest,
    patch: QuestPatchRequest,
    okMsg: string,
    revert?: () => void
  ) {
    patchQuest.mutate(
      { code: quest.code, patch },
      {
        onSuccess: () => message.success(okMsg),
        // handleAdminMutationError đã hiện notification lỗi BE (GAMIFICATION_INVALID_CONFIG);
        // revert ô nhập về giá trị đã lưu rồi refetch để đồng bộ bảng.
        onError: () => {
          revert?.();
          refetch();
        },
      }
    );
  }

  function handleToggleActive(quest: Quest, next: boolean) {
    if (!next && quest.active) {
      Modal.confirm({
        title: `Tắt nhiệm vụ ${quest.code}?`,
        content:
          "Người học sẽ ngừng nhận xu từ nhiệm vụ này kể từ bây giờ. Nhiệm vụ vẫn được giữ lại và có thể bật lại sau.",
        okText: "Tắt nhiệm vụ",
        okButtonProps: { danger: true },
        cancelText: "Huỷ",
        onOk: () => commitField(quest, { active: false }, "Đã tắt nhiệm vụ"),
      });
      return;
    }
    commitField(quest, { active: next }, next ? "Đã bật nhiệm vụ" : "Đã tắt nhiệm vụ");
  }

  const columns: TableProps<Quest>["columns"] = [
    { title: "Mã", dataIndex: "code", fixed: "left", width: 190 },
    { title: "Tiêu đề", dataIndex: "title", width: 200 },
    { title: "Trigger", dataIndex: "triggerEventType", width: 180, render: (t: string) => <Tag>{t}</Tag> },
    {
      title: "Thưởng xu",
      dataIndex: "rewardCoin",
      width: 140,
      render: (v: number, record: Quest) => (
        <EditableNumberCell
          value={v}
          min={1}
          warn={(n) => n < COIN_MIN || n > COIN_MAX}
          onCommit={(next, revert) =>
            commitField(record, { rewardCoin: next }, "Đã cập nhật xu thưởng", revert)}
        />
      ),
    },
    {
      title: "Số lần đạt",
      dataIndex: "targetCount",
      width: 110,
      render: (v: number, record: Quest) => (
        <EditableNumberCell
          value={v}
          min={1}
          onCommit={(next, revert) =>
            commitField(record, { targetCount: next }, "Đã cập nhật số lần đạt", revert)}
        />
      ),
    },
    {
      title: "Giới hạn/ngày",
      dataIndex: "dailyLimit",
      width: 120,
      render: (v: number, record: Quest) => (
        <EditableNumberCell
          value={v}
          min={1}
          onCommit={(next, revert) =>
            commitField(record, { dailyLimit: next }, "Đã cập nhật giới hạn/ngày", revert)}
        />
      ),
    },
    { title: "Thứ tự", dataIndex: "sortOrder", width: 80 },
    {
      title: "Hoạt động",
      dataIndex: "active",
      width: 100,
      render: (active: boolean, record: Quest) => (
        <Can permissions={["gamification.admin.manage"]} fallback={<Tag>{active ? "Bật" : "Tắt"}</Tag>}>
          <Switch
            checked={active}
            loading={patchQuest.isPending}
            onChange={(checked) => handleToggleActive(record, checked)}
          />
        </Can>
      ),
    },
    {
      title: "Thao tác",
      fixed: "right",
      width: 90,
      render: (_: unknown, record: Quest) => (
        <Can permissions={["gamification.admin.manage"]}>
          <Button size="small" onClick={() => { setEditing(record); setFormOpen(true); }}>
            Sửa
          </Button>
        </Can>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Nhiệm vụ (Quest)</Typography.Title>
      <Typography.Paragraph type="secondary">
        Cấu hình nhiệm vụ và phần thưởng xu. Hướng dẫn kinh tế: mỗi nhiệm vụ nên thưởng{" "}
        {COIN_MIN}–{COIN_MAX} xu (1000 xu = 1000đ). Sửa xu/giới hạn ngay trong bảng — Enter hoặc
        rời ô để lưu.
      </Typography.Paragraph>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Làm mới
          </Button>
          <Can permissions={["gamification.admin.manage"]}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setEditing(null); setFormOpen(true); }}
            >
              Thêm nhiệm vụ
            </Button>
          </Can>
        </Space>
      </Card>

      {isError && (
        <Alert
          type="error"
          message="Không thể tải danh sách nhiệm vụ"
          description={error?.message}
          action={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>Thử lại</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="code"
        columns={columns}
        dataSource={data ?? []}
        loading={isLoading}
        pagination={false}
        scroll={{ x: 1180 }}
      />

      <QuestFormModal
        open={formOpen}
        quest={editing}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
}
