import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { LockOutlined, ReloadOutlined, UnlockOutlined, UserSwitchOutlined } from "@ant-design/icons";
import { Can } from "../../../shared/permissions";
import {
  useAssignCtv,
  useGroup,
  useRevokeCtv,
  useToggleGroupLock,
  useTransferGroupOwner,
} from "../api/community.api";
import type { Member } from "../shared/types";
import type { TableProps } from "antd";

const CTV_PERMISSION_OPTIONS = [
  { label: "community.report.view", value: "community.report.view" },
  { label: "community.report.resolve", value: "community.report.resolve" },
];

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { data: group, isLoading, isError, error, refetch } = useGroup(groupId);
  const transfer = useTransferGroupOwner();
  const toggleLock = useToggleGroupLock();
  const assignCtv = useAssignCtv();
  const revokeCtv = useRevokeCtv();

  const [transferOpen, setTransferOpen] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState("");
  const [transferReason, setTransferReason] = useState("");

  const [lockOpen, setLockOpen] = useState(false);
  const [lockReason, setLockReason] = useState("");
  const [lockAction, setLockAction] = useState<"lock" | "unlock">("lock");

  const [ctvOpen, setCtvOpen] = useState(false);
  const [ctvUserId, setCtvUserId] = useState("");
  const [ctvUserName, setCtvUserName] = useState("");
  const [ctvPerms, setCtvPerms] = useState<string[]>([]);

  const [revokeTarget, setRevokeTarget] = useState<{ id: string; userName: string } | null>(null);

  if (isLoading) return <Skeleton active paragraph={{ rows: 10 }} />;

  if (isError || !group) {
    return (
      <Alert
        type="error"
        message="Không thể tải chi tiết group"
        description={error?.message}
        action={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>Thử lại</Button>}
      />
    );
  }

  function handleTransfer() {
    if (!newOwnerId.trim() || !transferReason.trim()) {
      message.error("Vui lòng chọn owner mới và nhập lý do");
      return;
    }
    transfer.mutate(
      { id: group!.id, newOwnerId: newOwnerId.trim(), reason: transferReason.trim() },
      {
        onSuccess: () => {
          message.success("Đã chuyển owner");
          setTransferOpen(false);
          setNewOwnerId("");
          setTransferReason("");
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  function handleLock() {
    if (lockAction === "lock" && !lockReason.trim()) {
      message.error("Vui lòng nhập lý do khoá");
      return;
    }
    toggleLock.mutate(
      { id: group!.id, lock: lockAction === "lock", reason: lockReason.trim() || undefined },
      {
        onSuccess: () => {
          message.success(lockAction === "lock" ? "Đã khoá group" : "Đã mở khoá group");
          setLockOpen(false);
          setLockReason("");
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  function handleRevokeCtv() {
    if (!revokeTarget) return;
    revokeCtv.mutate(
      { id: group!.id, assignmentId: revokeTarget.id },
      {
        onSuccess: () => {
          message.success("Đã thu hồi quyền CTV");
          setRevokeTarget(null);
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  function handleAssignCtv() {
    if (!ctvUserId.trim() || ctvPerms.length === 0) {
      message.error("Vui lòng chọn user và ít nhất một quyền");
      return;
    }
    assignCtv.mutate(
      { id: group!.id, userId: ctvUserId.trim(), userName: ctvUserName.trim() || ctvUserId.trim(), permissions: ctvPerms },
      {
        onSuccess: () => {
          message.success("Đã gán CTV");
          setCtvOpen(false);
          setCtvUserId("");
          setCtvUserName("");
          setCtvPerms([]);
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  const memberColumns: TableProps<Member>["columns"] = [
    { title: "User", dataIndex: "userName" },
    { title: "Vai trò", dataIndex: "role" },
  ];

  const ctvColumns = [
    { title: "User", dataIndex: "userName" },
    { title: "Quyền", dataIndex: "permissions", render: (v: string[]) => v.join(", ") },
    {
      title: "Thao tác",
      render: (_: unknown, record: { id: string; userName: string }) => (
        <Can permissions={["group.assign_ctv"]}>
          <Button size="small" danger onClick={() => setRevokeTarget(record)}>
            Thu hồi
          </Button>
        </Can>
      ),
    },
  ];

  const items = [
    {
      key: "overview",
      label: "Tổng quan",
      children: (
        <>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Tên">{group.name}</Descriptions.Item>
            <Descriptions.Item label="Owner">{group.ownerName}</Descriptions.Item>
            <Descriptions.Item label="Thành viên">{group.memberCount}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={group.status === "locked" ? "red" : "green"}>{group.status}</Tag>
            </Descriptions.Item>
            {group.lockedReason && <Descriptions.Item label="Lý do khoá">{group.lockedReason}</Descriptions.Item>}
          </Descriptions>
          <Space style={{ marginTop: 16 }}>
            <Can permissions={["group.transfer"]}>
              <Button icon={<UserSwitchOutlined />} onClick={() => setTransferOpen(true)}>
                Đổi owner
              </Button>
            </Can>
            <Can permissions={["group.lock"]}>
              {group.status === "active" ? (
                <Button icon={<LockOutlined />} danger onClick={() => { setLockAction("lock"); setLockReason(""); setLockOpen(true); }}>
                  Khoá group
                </Button>
              ) : (
                <Button icon={<UnlockOutlined />} onClick={() => { setLockAction("unlock"); setLockOpen(true); }}>
                  Mở khoá group
                </Button>
              )}
            </Can>
            <Can permissions={["group.assign_ctv"]}>
              <Button onClick={() => setCtvOpen(true)}>Gán CTV</Button>
            </Can>
          </Space>
        </>
      ),
    },
    { key: "members", label: "Thành viên", children: <Table rowKey="userId" columns={memberColumns} dataSource={group.members} pagination={false} /> },
    { key: "posts", label: "Posts", children: <Table rowKey="id" columns={[{ title: "Tiêu đề", dataIndex: "title" }, { title: "Tác giả", dataIndex: "authorName" }]} dataSource={group.posts} pagination={false} /> },
    { key: "ctv", label: "CTV", children: <Table rowKey="id" columns={ctvColumns} dataSource={group.ctvAssignments} pagination={false} /> },
  ];

  return (
    <div>
      <Typography.Title level={3}>{group.name}</Typography.Title>
      <Tabs items={items} />

      <Modal
        open={transferOpen}
        title="Chuyển quyền owner"
        onOk={handleTransfer}
        onCancel={() => setTransferOpen(false)}
        confirmLoading={transfer.isPending}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>Hệ quả: Owner hiện tại mất quyền quản lý group.</Typography.Text>
          <Input placeholder="User ID owner mới" value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)} />
          <Input.TextArea placeholder="Lý do (bắt buộc)" value={transferReason} onChange={(e) => setTransferReason(e.target.value)} rows={3} />
        </Space>
      </Modal>

      <Modal
        open={lockOpen}
        title={lockAction === "lock" ? "Khoá group" : "Mở khoá group"}
        onOk={handleLock}
        onCancel={() => setLockOpen(false)}
        confirmLoading={toggleLock.isPending}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          {lockAction === "lock" && (
            <Typography.Text>Hệ quả: member không đăng bài được, group ẩn khỏi khám phá.</Typography.Text>
          )}
          {lockAction === "lock" && (
            <Input.TextArea placeholder="Lý do khoá (bắt buộc)" value={lockReason} onChange={(e) => setLockReason(e.target.value)} rows={3} />
          )}
        </Space>
      </Modal>

      <Modal
        open={!!revokeTarget}
        title="Thu hồi quyền CTV"
        onOk={handleRevokeCtv}
        onCancel={() => setRevokeTarget(null)}
        confirmLoading={revokeCtv.isPending}
        okText="Thu hồi"
        cancelText="Huỷ"
        okButtonProps={{ danger: true }}
      >
        <Typography.Text>
          CTV <strong>{revokeTarget?.userName}</strong> sẽ mất quyền truy cập group sau lần làm mới quyền tiếp theo. Tiếp tục?
        </Typography.Text>
      </Modal>

      <Modal
        open={ctvOpen}
        title="Gán CTV"
        onOk={handleAssignCtv}
        onCancel={() => setCtvOpen(false)}
        confirmLoading={assignCtv.isPending}
      >
        <Form layout="vertical">
          <Form.Item label="User ID">
            <Input value={ctvUserId} onChange={(e) => setCtvUserId(e.target.value)} />
          </Form.Item>
          <Form.Item label="Tên hiển thị">
            <Input value={ctvUserName} onChange={(e) => setCtvUserName(e.target.value)} />
          </Form.Item>
          <Form.Item label="Quyền CTV">
            <Select mode="multiple" options={CTV_PERMISSION_OPTIONS} value={ctvPerms} onChange={setCtvPerms} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
