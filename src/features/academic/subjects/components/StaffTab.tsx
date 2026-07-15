import { useState } from "react";
import { Alert, Button, Input, Modal, Radio, Skeleton, Space, Table, Tag, Typography, message } from "antd";
import { MinusCircleOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import type { SubjectDetail, SubjectStaffRole, SubjectStaffView } from "../../types";
import { useReplaceSubjectStaff, useSubjectStaff } from "../api/subjects.api";

interface StaffTabProps {
  subject: SubjectDetail;
}

const ROLE_LABELS: Record<SubjectStaffRole, string> = {
  LECTURER: "Giảng viên",
  MODERATOR: "Moderator",
  CONTRIBUTOR: "Cộng tác viên",
};

const ROLE_COLORS: Record<SubjectStaffRole, string> = {
  LECTURER: "blue",
  MODERATOR: "purple",
  CONTRIBUTOR: "cyan",
};

/**
 * Nhân sự môn học — GET/PUT /api/v1/subjects/{code}/staff (key theo CODE, authz subject.manage).
 * PUT replace-semantics: gửi danh sách CUỐI; người bị bỏ khỏi danh sách được HẠ VỀ STUDENT
 * (vẫn là thành viên môn, không bị kick). Role chỉ có MODERATOR/LECTURER/CONTRIBUTOR —
 * "manager" là quyền RBAC global (subject.manage), quản ở trang RBAC chứ không ở đây.
 */
export function StaffTab({ subject }: StaffTabProps) {
  const { data: staff, isLoading, isError, error, refetch } = useSubjectStaff(subject.code);
  const replace = useReplaceSubjectStaff(subject);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<SubjectStaffRole>("LECTURER");

  const persist = (next: { userId: string; role: SubjectStaffRole }[], successMsg: string) => {
    replace.mutate(next, {
      onSuccess: () => message.success(successMsg),
      // onError chung đã có notification (handleAdminMutationError) trong hook.
    });
  };

  const toReplaceList = () => (staff ?? []).map((s) => ({ userId: s.userId, role: s.role }));

  const handleAdd = () => {
    const trimmed = userId.trim();
    if (!trimmed) return;
    if ((staff ?? []).some((s) => s.userId === trimmed)) {
      message.warning("User đã là nhân sự của môn này");
      return;
    }
    persist([...toReplaceList(), { userId: trimmed, role }], "Đã thêm nhân sự");
    setUserId("");
  };

  const handleChangeRole = (record: SubjectStaffView, nextRole: SubjectStaffRole) => {
    if (record.role === nextRole) return;
    persist(
      toReplaceList().map((s) => (s.userId === record.userId ? { ...s, role: nextRole } : s)),
      "Đã đổi vai trò"
    );
  };

  const handleRemove = (record: SubjectStaffView) => {
    Modal.confirm({
      title: "Gỡ nhân sự",
      content: (
        <>
          Gỡ <strong>{record.displayName || record.username || record.userId}</strong> khỏi nhân sự
          môn <strong>{subject.name}</strong>? Người này được hạ về STUDENT (vẫn là thành viên môn,
          không bị xoá khỏi môn). Thay đổi này được ghi audit.
        </>
      ),
      okText: "Gỡ",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () => {
        persist(
          toReplaceList().filter((s) => s.userId !== record.userId),
          "Đã gỡ nhân sự"
        );
      },
    });
  };

  const columns = [
    { title: "User ID", dataIndex: "userId" },
    {
      title: "Họ tên",
      key: "name",
      render: (_: unknown, r: SubjectStaffView) => r.displayName || r.username || "—",
    },
    { title: "Email", dataIndex: "email", render: (v: string | null) => v || "—" },
    {
      title: "Vai trò",
      dataIndex: "role",
      render: (r: SubjectStaffRole, record: SubjectStaffView) => (
        <Can permissions={["subject.manage"]} fallback={<Tag color={ROLE_COLORS[r]}>{ROLE_LABELS[r]}</Tag>}>
          <Radio.Group
            size="small"
            value={r}
            disabled={replace.isPending}
            onChange={(e) => handleChangeRole(record, e.target.value as SubjectStaffRole)}
          >
            {(Object.keys(ROLE_LABELS) as SubjectStaffRole[]).map((value) => (
              <Radio.Button key={value} value={value}>
                {ROLE_LABELS[value]}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Can>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record: SubjectStaffView) => (
        <Can permissions={["subject.manage"]}>
          <Button
            icon={<MinusCircleOutlined />}
            danger
            size="small"
            loading={replace.isPending}
            onClick={() => handleRemove(record)}
          >
            Gỡ
          </Button>
        </Can>
      ),
    },
  ];

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }

  return (
    <div>
      <Typography.Title level={5}>Nhân sự môn học</Typography.Title>
      {isError && (
        <Alert
          type="error"
          message="Không thể tải danh sách nhân sự"
          description={error?.message}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={() => refetch()}>
              Thử lại
            </Button>
          }
        />
      )}
      <Can permissions={["subject.manage"]}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="Nhập user ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onPressEnter={handleAdd}
            style={{ width: 220 }}
          />
          <Radio.Group value={role} onChange={(e) => setRole(e.target.value as SubjectStaffRole)}>
            {(Object.keys(ROLE_LABELS) as SubjectStaffRole[]).map((value) => (
              <Radio.Button key={value} value={value}>
                {ROLE_LABELS[value]}
              </Radio.Button>
            ))}
          </Radio.Group>
          <Button type="primary" icon={<PlusOutlined />} loading={replace.isPending} onClick={handleAdd}>
            Thêm
          </Button>
        </Space>
      </Can>

      <Typography.Text strong>Nhân sự ({staff?.length ?? 0})</Typography.Text>
      <Table
        rowKey="userId"
        dataSource={staff ?? []}
        columns={columns}
        pagination={false}
        size="small"
        style={{ marginTop: 8 }}
      />
    </div>
  );
}
