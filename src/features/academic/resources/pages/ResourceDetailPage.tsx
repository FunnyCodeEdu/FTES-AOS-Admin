import { useParams } from "react-router-dom";
import { Alert, Button, Card, Descriptions, Skeleton, Tabs, Tag, Typography, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Can } from "../../../../shared/permissions";
import type { ResourceFormValues } from "../../types";
import { useResource, useUpdateResource } from "../api/resources.api";
import { ResourceFormModal } from "../components/ResourceFormModal";
import { VersionsTab } from "../components/VersionsTab";

const statusColors = {
  pending: "orange",
  approved: "green",
  rejected: "red",
};

const visibilityLabels = {
  public: "Công khai",
  enrolled: "Học viên đăng ký",
  package_only: "Theo gói",
};

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: resource, isLoading, isError, error, refetch } = useResource(id);
  const update = useUpdateResource(id);
  const [editOpen, setEditOpen] = useState(false);

  const handleUpdate = (values: ResourceFormValues) => {
    update.mutate(values, {
      onSuccess: () => {
        message.success("Đã cập nhật học liệu");
        setEditOpen(false);
      },
      onError: (err: Error) => message.error(err.message || "Lưu thất bại"),
    });
  };

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;

  if (isError || !resource) {
    return (
      <Alert
        type="error"
        message="Không thể tải học liệu"
        description={error?.message}
        action={
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  const items = [
    {
      key: "info",
      label: "Thông tin",
      children: (
        <>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Tên">{resource.title}</Descriptions.Item>
            <Descriptions.Item label="Môn">{resource.subjectName}</Descriptions.Item>
            <Descriptions.Item label="Loại">{resource.type}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={statusColors[resource.status]}>{resource.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Visibility">{visibilityLabels[resource.visibility]}</Descriptions.Item>
            <Descriptions.Item label="License">{resource.license || "—"}</Descriptions.Item>
            <Descriptions.Item label="Phiên bản hiện tại">{resource.currentVersion}</Descriptions.Item>
            <Descriptions.Item label="Ngưởi tạo">{resource.createdBy}</Descriptions.Item>
          </Descriptions>
          {resource.rejectReason && (
            <Alert
              type="error"
              message="Lý do từ chối"
              description={resource.rejectReason}
              style={{ marginTop: 16 }}
            />
          )}
          <Can permissions={["resource.update"]}>
            <Button type="primary" style={{ marginTop: 16 }} onClick={() => setEditOpen(true)}>
              Sửa metadata
            </Button>
          </Can>
        </>
      ),
    },
    { key: "versions", label: "Versions", children: <VersionsTab resource={resource} /> },
  ];

  return (
    <div>
      <Typography.Title level={3}>{resource.title}</Typography.Title>
      <Card>
        <Tabs items={items} />
      </Card>
      <ResourceFormModal
        open={editOpen}
        resource={resource}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        isSubmitting={update.isPending}
      />
    </div>
  );
}
