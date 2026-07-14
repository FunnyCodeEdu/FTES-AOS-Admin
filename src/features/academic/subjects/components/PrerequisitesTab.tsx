import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Select, Tooltip, Typography, message } from "antd";
import { Can } from "../../../../shared/permissions";
import { ApiError } from "../../../../shared/api/client";
import type { SubjectDetail } from "../../types";
import {
  SUBJECT_STAFF_PREREQ_UNSUPPORTED_HINT,
  useSubjects,
  useUpdatePrerequisites,
} from "../api/subjects.api";

interface PrerequisitesTabProps {
  subject: SubjectDetail;
}

export function PrerequisitesTab({ subject }: PrerequisitesTabProps) {
  const { data: subjectsData, isLoading } = useSubjects({ page: 1, pageSize: 1000 });
  const update = useUpdatePrerequisites(subject.id);
  const [selected, setSelected] = useState<string[]>([]);
  const [cycleError, setCycleError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(subject.prerequisites.map((s) => s.id));
  }, [subject.prerequisites]);

  const options = useMemo(() => {
    return (subjectsData?.items ?? [])
      .filter((s) => s.id !== subject.id)
      .map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }));
  }, [subjectsData, subject.id]);

  const handleSave = () => {
    setCycleError(null);
    update.mutate(
      { subjectIds: selected },
      {
        onSuccess: () => message.success("Đã cập nhật prerequisites"),
        onError: (err: Error) => {
          const code = err instanceof ApiError ? err.code : undefined;
          if (code === 422) {
            setCycleError(err.message);
          } else {
            message.error(err.message || "Lưu thất bại");
          }
        },
      }
    );
  };

  return (
    <div>
      <Typography.Title level={5}>Prerequisites</Typography.Title>
      {cycleError && (
        <Alert
          type="error"
          message="Tạo vòng phụ thuộc"
          description={cycleError}
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setCycleError(null)}
        />
      )}
      {/* BE chưa có PUT /admin/subjects/{id}/prerequisites — disable form ghi, xem subjects.api.ts. */}
      <Select
        mode="multiple"
        loading={isLoading}
        options={options}
        value={selected}
        onChange={setSelected}
        style={{ width: "100%", maxWidth: 600 }}
        placeholder="Chọn môn học tiên quyết"
        disabled
      />
      <Can permissions={["subject.manage"]}>
        <div style={{ marginTop: 16 }}>
          <Tooltip title={SUBJECT_STAFF_PREREQ_UNSUPPORTED_HINT}>
            <Button type="primary" disabled onClick={handleSave} loading={update.isPending}>
              Lưu prerequisites
            </Button>
          </Tooltip>
        </div>
      </Can>
    </div>
  );
}
