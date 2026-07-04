import { useState } from "react";
import { Button, Input, Modal, Radio, Space, Table, Tag, Typography, message } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import type { SubjectDetail, SubjectStaff } from "../../types";
import { useUpdateStaff } from "../api/subjects.api";

interface StaffTabProps {
  subject: SubjectDetail;
}

export function StaffTab({ subject }: StaffTabProps) {
  const update = useUpdateStaff(subject.id);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"lecturer" | "moderator">("lecturer");

  const lecturers = subject.staff.filter((s) => s.role === "lecturer");
  const moderators = subject.staff.filter((s) => s.role === "moderator");

  const handleAdd = () => {
    if (!userId.trim()) return;
    const exists = subject.staff.some((s) => s.userId === userId.trim());
    if (exists) {
      message.warning("User đã được gán");
      return;
    }
    const nextStaff = [...subject.staff];
    if (role === "lecturer") {
      nextStaff.push({
        userId: userId.trim(),
        fullName: userId.trim(),
        email: "",
        role: "lecturer",
      });
    } else {
      nextStaff.push({
        userId: userId.trim(),
        fullName: userId.trim(),
        email: "",
        role: "moderator",
      });
    }
    persist(nextStaff);
    setUserId("");
  };

  const handleRemove = (staff: SubjectStaff) => {
    Modal.confirm({
      title: "Gỡ nhân sự",
      content: (
        <>
          Gỡ <strong>{staff.fullName || staff.userId}</strong> khỏi môn <strong>{subject.name}</strong>?
          Thay đổi này được ghi audit.
        </>
      ),
      okText: "Gỡ",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () => {
        const next = subject.staff.filter((s) => s.userId !== staff.userId || s.role !== staff.role);
        persist(next);
      },
    });
  };

  const persist = (nextStaff: SubjectStaff[]) => {
    update.mutate(
      {
        lecturerIds: nextStaff.filter((s) => s.role === "lecturer").map((s) => s.userId),
        moderatorIds: nextStaff.filter((s) => s.role === "moderator").map((s) => s.userId),
      },
      {
        onSuccess: () => message.success("Đã cập nhật nhân sự"),
        onError: (err: Error) => message.error(err.message || "Cập nhật thất bại"),
      }
    );
  };

  const columns = [
    { title: "User ID", dataIndex: "userId" },
    { title: "Họ tên", dataIndex: "fullName" },
    { title: "Email", dataIndex: "email" },
    {
      title: "Vai trò",
      dataIndex: "role",
      render: (r: "lecturer" | "moderator") => (
        <Tag color={r === "lecturer" ? "blue" : "purple"}>
          {r === "lecturer" ? "Giảng viên" : "Moderator"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record: SubjectStaff) => (
        <Can permissions={["subject.assign_staff"]}>
          <Button
            icon={<MinusCircleOutlined />}
            danger
            size="small"
            onClick={() => handleRemove(record)}
          >
            Gỡ
          </Button>
        </Can>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={5}>Nhân sự môn học</Typography.Title>
      <Can permissions={["subject.assign_staff"]}>
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="Nhập user ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onPressEnter={handleAdd}
            style={{ width: 220 }}
          />
          <Radio.Group value={role} onChange={(e) => setRole(e.target.value)}>
            <Radio.Button value="lecturer">Giảng viên</Radio.Button>
            <Radio.Button value="moderator">Moderator</Radio.Button>
          </Radio.Group>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Thêm
          </Button>
        </Space>
      </Can>

      <Typography.Text strong>Giảng viên ({lecturers.length})</Typography.Text>
      <Table
        rowKey={(r) => `${r.userId}-lecturer`}
        dataSource={lecturers}
        columns={columns}
        pagination={false}
        size="small"
        style={{ marginBottom: 24 }}
      />

      <Typography.Text strong>Moderator ({moderators.length})</Typography.Text>
      <Table
        rowKey={(r) => `${r.userId}-moderator`}
        dataSource={moderators}
        columns={columns}
        pagination={false}
        size="small"
      />
    </div>
  );
}
