import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { Can } from "../../../shared/permissions";
import { useXpRules, useUpsertXpRule } from "../api/gamification.api";
import type { XpRule, XpRuleUpsertRequest } from "../api/gamification.api";
import { XpRuleFormModal } from "../components/XpRuleFormModal";

/** Dựng body upsert đầy đủ từ record hiện có + patch (POST upsert theo ruleKey gửi record đầy đủ). */
function toUpsertBody(rule: XpRule, patch: Partial<XpRuleUpsertRequest>): XpRuleUpsertRequest {
  return {
    ruleKey: rule.ruleKey,
    amount: rule.amount,
    dailyCap: rule.dailyCap,
    reputationAmount: rule.reputationAmount,
    active: rule.active,
    ...patch,
  };
}

export default function XpRulesPage() {
  const { data, isLoading, isError, error, refetch } = useXpRules();
  const upsert = useUpsertXpRule();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<XpRule | null>(null);

  function commitField(rule: XpRule, patch: Partial<XpRuleUpsertRequest>, okMsg: string) {
    upsert.mutate(toUpsertBody(rule, patch), {
      onSuccess: () => message.success(okMsg),
      // handleAdminMutationError đã hiện notification lỗi BE; refetch để đồng bộ Switch về trạng thái đã lưu.
      onError: () => refetch(),
    });
  }

  function handleToggleActive(rule: XpRule, next: boolean) {
    // Không có delete — retire = active:false. Tắt rule đang bật ⇒ ngừng cộng XP: confirm trước.
    if (!next && rule.active) {
      Modal.confirm({
        title: `Ngừng áp dụng rule ${rule.ruleKey}?`,
        content:
          "Người dùng sẽ ngừng nhận XP từ rule này kể từ bây giờ. Rule vẫn được giữ lại và có thể bật lại sau.",
        okText: "Ngừng áp dụng",
        okButtonProps: { danger: true },
        cancelText: "Huỷ",
        onOk: () => commitField(rule, { active: false }, "Đã ngừng áp dụng rule"),
      });
      return;
    }
    commitField(rule, { active: next }, next ? "Đã bật rule" : "Đã ngừng áp dụng rule");
  }

  const columns: TableProps<XpRule>["columns"] = [
    { title: "Khoá rule", dataIndex: "ruleKey", fixed: "left", width: 260 },
    { title: "Điểm XP", dataIndex: "amount", width: 110 },
    {
      title: "Giới hạn/ngày",
      dataIndex: "dailyCap",
      width: 130,
      render: (v: number | null) =>
        v === null || v === undefined ? <Tag>Không giới hạn</Tag> : v,
    },
    { title: "Điểm uy tín", dataIndex: "reputationAmount", width: 120 },
    {
      title: "Hoạt động",
      dataIndex: "active",
      width: 100,
      render: (active: boolean, record: XpRule) => (
        <Can permissions={["gamification.admin.manage"]} fallback={<Tag>{active ? "Bật" : "Tắt"}</Tag>}>
          <Switch
            checked={active}
            loading={upsert.isPending}
            onChange={(checked) => handleToggleActive(record, checked)}
          />
        </Can>
      ),
    },
    {
      title: "Thao tác",
      fixed: "right",
      width: 90,
      render: (_: unknown, record: XpRule) => (
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
      <Typography.Title level={3}>XP Rules</Typography.Title>
      <Typography.Paragraph type="secondary">
        Cấu hình điểm XP / uy tín cộng cho từng sự kiện. Không xoá được rule — ngừng áp dụng bằng
        cách tắt hoạt động (active = false). Thêm/sửa qua nút bên dưới.
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
              Thêm XP rule
            </Button>
          </Can>
        </Space>
      </Card>

      {isError && (
        <Alert
          type="error"
          message="Không thể tải danh sách XP rule"
          description={error?.message}
          action={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>Thử lại</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="ruleKey"
        columns={columns}
        dataSource={data ?? []}
        loading={isLoading}
        pagination={false}
        scroll={{ x: 820 }}
      />

      <XpRuleFormModal
        open={formOpen}
        rule={editing}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
}
