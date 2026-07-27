import { useParams } from "react-router-dom";
import { Alert, Button, Card, Descriptions, Skeleton, Space, Tabs, Tag, Typography, message } from "antd";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Can } from "../../../../shared/permissions";
import { downloadResourceFile, useResource } from "../api/resources.api";
import { adminErrorMessage } from "../../../../shared/api/errors";
import { ResourceFormModal } from "../components/ResourceFormModal";
import { VersionsTab } from "../components/VersionsTab";
import { RESOURCE_VISIBILITY_LABELS } from "../constants";

const statusColors = {
  pending: "orange",
  approved: "green",
  rejected: "red",
};

// Nhãn visibility dùng chung (Contract B) — nguồn duy nhất tại resources/constants.ts.
const visibilityLabels = RESOURCE_VISIBILITY_LABELS;

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: resource, isLoading, isError, error, refetch } = useResource(id);
  const [editOpen, setEditOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!resource) return;
    setDownloading(true);
    try {
      await downloadResourceFile(resource.id);
    } catch (err) {
      message.error(adminErrorMessage(err));
    } finally {
      setDownloading(false);
    }
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
              <Tag
                color={
                  statusColors[resource.status as keyof typeof statusColors] ??
                  statusColors[resource.status?.toLowerCase?.() as keyof typeof statusColors] ??
                  "default"
                }
              >
                {String(resource.status ?? "")}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Visibility">
              {visibilityLabels[resource.visibility as keyof typeof visibilityLabels] ??
                visibilityLabels[resource.visibility?.toLowerCase?.() as keyof typeof visibilityLabels] ??
                String(resource.visibility ?? "")}
            </Descriptions.Item>
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
          <Space style={{ marginTop: 16 }}>
            <Can permissions={["admin.resource.manage"]}>
              <Button type="primary" onClick={() => setEditOpen(true)}>
                Sửa / tải phiên bản mới
              </Button>
            </Can>
            <Button icon={<DownloadOutlined />} loading={downloading} onClick={handleDownload}>
              Tải xuống
            </Button>
          </Space>
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
        onSaved={() => {
          refetch();
          setEditOpen(false);
        }}
      />
    </div>
  );
}
