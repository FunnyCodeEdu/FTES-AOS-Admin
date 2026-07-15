import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Select, Typography, message } from "antd";
import { Can } from "../../../../shared/permissions";
import { ApiError } from "../../../../shared/api/client";
import type { SubjectDetail } from "../../types";
import { useSubjects, useUpdatePrerequisites } from "../api/subjects.api";

interface PrerequisitesTabProps {
  subject: SubjectDetail;
}

export function PrerequisitesTab({ subject }: PrerequisitesTabProps) {
  const { data: subjectsData, isLoading } = useSubjects({ page: 1, pageSize: 1000 });
  // PUT /subjects/{code}/prerequisites (SubjectCatalogController) — key theo CODE, invalidate theo id.
  const update = useUpdatePrerequisites(subject);
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
          const apiErr = err instanceof ApiError ? err : undefined;
          // BE trả 400 + errorCode SUBJECT_PREREQ_CYCLE khi tạo vòng phụ thuộc.
          if (apiErr?.errorCode === "SUBJECT_PREREQ_CYCLE" || apiErr?.code === 422) {
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
      <Select
        mode="multiple"
        loading={isLoading}
        options={options}
        value={selected}
        onChange={setSelected}
        style={{ width: "100%", maxWidth: 600 }}
        placeholder="Chọn môn học tiên quyết"
      />
      <Can permissions={["subject.manage"]}>
        <div style={{ marginTop: 16 }}>
          <Button type="primary" onClick={handleSave} loading={update.isPending}>
            Lưu prerequisites
          </Button>
        </div>
      </Can>
    </div>
  );
}
