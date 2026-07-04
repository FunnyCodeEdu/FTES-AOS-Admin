import { Descriptions, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { UserProfile } from "../types";

interface ProfileTabProps {
  profile: UserProfile;
}

export function ProfileTab({ profile }: ProfileTabProps) {
  return (
    <Descriptions bordered column={2}>
      <Descriptions.Item label="Họ tên">{profile.fullName}</Descriptions.Item>
      <Descriptions.Item label="Email">{profile.email}</Descriptions.Item>
      <Descriptions.Item label="Số điện thoại">{profile.phone || "—"}</Descriptions.Item>
      <Descriptions.Item label="Campus">{profile.campus || "—"}</Descriptions.Item>
      <Descriptions.Item label="Trạng thái">
        <Tag color={profile.status === "active" ? "green" : profile.status === "locked" ? "red" : "orange"}>
          {profile.status === "active" ? "Đang hoạt động" : profile.status === "locked" ? "Đã khoá" : "Chờ xác nhận"}
        </Tag>
      </Descriptions.Item>
      <Descriptions.Item label="Vai trò">
        {profile.roles.map((r) => (
          <Tag key={r.roleId}>{r.name}</Tag>
        ))}
      </Descriptions.Item>
      <Descriptions.Item label="Ngày tạo">{dayjs(profile.createdAt).format("DD/MM/YYYY HH:mm")}</Descriptions.Item>
      <Descriptions.Item label="Cập nhật lúc">{dayjs(profile.updatedAt).format("DD/MM/YYYY HH:mm")}</Descriptions.Item>
      {profile.lockReason && (
        <Descriptions.Item label="Lý do khoá" span={2}>
          <Typography.Text type="danger">{profile.lockReason}</Typography.Text>
        </Descriptions.Item>
      )}
    </Descriptions>
  );
}
