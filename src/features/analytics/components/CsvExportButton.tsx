import { useState } from "react";
import { Button, notification } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { Can } from "../../../shared/permissions";
import { exportDomainCsv } from "../api/analytics.api";
import type { AnalyticsDomain, DateRange } from "../shared/types";

interface CsvExportButtonProps {
  domain: AnalyticsDomain;
  range: DateRange;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

export function CsvExportButton({ domain, range }: CsvExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const blob = await exportDomainCsv(domain, range);
      const filename = `${domain}_${range.from}_${range.to}.csv`;
      downloadBlob(blob, filename);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Xuất CSV thất bại";
      notification.error({ message: "Lỗi xuất CSV", description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Can permissions={["admin.analytics.read"]}>
      <Button
        icon={<DownloadOutlined />}
        loading={loading}
        onClick={handleExport}
      >
        Export CSV
      </Button>
    </Can>
  );
}
