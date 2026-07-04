import { Alert, Button, Modal, Table, Tag, Typography, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import type { ResourceDetail, ResourceVersion } from "../../types";
import { useResourceVersions, useRestoreResourceVersion } from "../api/resources.api";

interface VersionsTabProps {
  resource: ResourceDetail;
}

export function VersionsTab({ resource }: VersionsTabProps) {
  const { data, isLoading, isError, error, refetch } = useResourceVersions(resource.id);
  const restore = useRestoreResourceVersion(resource.id);

  const handleRestore = (version: ResourceVersion) => {
    Modal.confirm({
      title: "Restore phiên bản",
      content: (
        <>
          Restore về phiên bản <strong>{version.version}</strong> sẽ tạo một phiên bản mới từ nội dung cũ.
          Phiên bản hiện tại sẽ không bị xoá.
        </>
      ),
      okText: "Restore",
      onOk: () => {
        restore.mutate(version.version, {
          onSuccess: () => message.success("Đã restore phiên bản"),
          onError: (err: Error) => message.error(err.message || "Restore thất bại"),
        });
      },
    });
  };

  if (isLoading) return <Typography.Text type="secondary">Đang tải...</Typography.Text>;
  if (isError) {
    return (
      <Alert
        type="error"
        message="Không thể tải lịch sử phiên bản"
        description={error?.message}
        action={<Button icon={<ReloadOutlined />} size="small" onClick={() => refetch()}>Thử lại</Button>}
      />
    );
  }

  return (
    <Table
      rowKey="version"
      dataSource={data?.items ?? []}
      pagination={false}
      columns={[
        { title: "Phiên bản", dataIndex: "version" },
        {
          title: "Trạng thái",
          dataIndex: "status",
          render: (status: ResourceVersion["status"]) => (
            <Tag color={status === "approved" ? "green" : status === "pending" ? "orange" : "red"}>{status}</Tag>
          ),
        },
        { title: "Ngưởi tạo", dataIndex: "createdBy" },
        { title: "Thởi gian", dataIndex: "createdAt" },
        {
          title: "Thao tác",
          render: (_: unknown, record: ResourceVersion) => (
            <Can permissions={["resource.update"]}>
              <Button size="small" onClick={() => handleRestore(record)}>
                Restore
              </Button>
            </Can>
          ),
        },
      ]}
    />
  );
}
