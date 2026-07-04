import { useState } from "react";
import { Button, Modal, Space, Typography, message } from "antd";
import { DownloadOutlined, LoadingOutlined } from "@ant-design/icons";
import { useExportJob, useExportUsers } from "../api/users.api";
import type { UserListParams } from "../types";

interface ExportButtonProps {
  filters: UserListParams;
}

export function ExportButton({ filters }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState<string | undefined>();
  const exportUsers = useExportUsers();
  const { data: job } = useExportJob(jobId);

  const handleStart = () => {
    exportUsers.mutate(filters, {
      onSuccess: (res) => {
        setJobId(res.jobId);
      },
      onError: (err) => {
        message.error(err.message || "Không thể tạo job export");
      },
    });
  };

  const processing = job?.status === "pending" || job?.status === "processing";

  return (
    <>
      <Button icon={<DownloadOutlined />} onClick={() => setOpen(true)}>
        Export
      </Button>
      <Modal
        title="Export danh sách user"
        open={open}
        onCancel={() => {
          setOpen(false);
          setJobId(undefined);
        }}
        onOk={handleStart}
        okText={jobId ? "Tạo job mới" : "Bắt đầu export"}
        confirmLoading={exportUsers.isPending || processing}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>
            Hệ thống sẽ export danh sách user theo bộ filter hiện tại. Job sẽ được xử lý không
            đồng bộ và tự động cập nhật trạng thái.
          </Typography.Text>
          {jobId && (
            <div>
              <Typography.Text strong>Trạng thái: </Typography.Text>
              {processing ? (
                <Typography.Text>
                  <LoadingOutlined /> Đang xử lý…
                </Typography.Text>
              ) : job?.status === "completed" ? (
                <a href={job.downloadUrl} target="_blank" rel="noreferrer">
                  Tải file
                </a>
              ) : job?.status === "failed" ? (
                <Typography.Text type="danger">
                  Thất bại: {job.failedReason || "Không rõ lý do"}
                </Typography.Text>
              ) : (
                <Typography.Text>Không rõ trạng thái</Typography.Text>
              )}
            </div>
          )}
        </Space>
      </Modal>
    </>
  );
}
