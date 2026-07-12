import { useEffect, useState } from "react";
import { Button, Card, InputNumber, Modal, Space, Switch, Typography, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useI18n } from "../../../../shared/i18n";
import {
  useCoursePreviewDefault,
  useUpdateCoursePreviewDefault,
} from "../api/lessons.api";

interface CoursePreviewDefaultConfigProps {
  courseId: string;
}

export function CoursePreviewDefaultConfig({ courseId }: CoursePreviewDefaultConfigProps) {
  const { t } = useI18n();
  const { data: courseDefault } = useCoursePreviewDefault(courseId);
  const update = useUpdateCoursePreviewDefault(courseId);
  const [percent, setPercent] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState<number | null>(null);

  useEffect(() => {
    if (courseDefault) {
      const current = courseDefault.previewPercent ?? 0;
      setEnabled(current > 0);
      setPercent(current > 0 ? current : null);
    }
  }, [courseDefault]);

  const handleSave = () => {
    const value = enabled ? percent ?? 0 : 0;
    if (enabled && (value <= 0 || value > 100)) {
      message.error(t("lesson.preview.invalidPercent"));
      return;
    }
    setPendingValue(value);
    setIsModalOpen(true);
  };

  const handleConfirm = () => {
    if (pendingValue === null) return;
    update.mutate(
      { defaultPreviewPercent: pendingValue },
      {
        onSuccess: () => {
          message.success(t("course.previewDefault.saveSuccess"));
          setIsModalOpen(false);
          setPendingValue(null);
        },
        onError: (err: Error) => message.error(err.message || t("common.save") + " thất bại"),
      }
    );
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setPendingValue(null);
  };

  return (
    <>
      <Card title={t("course.previewDefault.title")} style={{ maxWidth: 480, marginTop: 24 }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>{t("course.previewDefault.description")}</Typography.Text>
          <Switch
            checked={enabled}
            onChange={(checked) => {
              setEnabled(checked);
              if (checked) setPercent(percent ?? 10);
            }}
            checkedChildren={t("lesson.preview.enabled")}
            unCheckedChildren={t("lesson.preview.disabled")}
          />
          <InputNumber
            value={percent ?? undefined}
            onChange={(v) => setPercent(typeof v === "number" ? v : null)}
            disabled={!enabled}
            min={1}
            max={100}
            formatter={(v) => `${v}%`}
            parser={(v) => (v ? Number(v.replace("%", "")) : 0)}
            style={{ width: 200 }}
          />
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={update.isPending}>
            {t("common.save")}
          </Button>
        </Space>
      </Card>
      <Modal
        open={isModalOpen}
        title={t("course.previewDefault.confirm")}
        onOk={handleConfirm}
        onCancel={handleCancel}
        confirmLoading={update.isPending}
        okText={t("common.confirm")}
        cancelText={t("common.cancel")}
      >
        <Typography.Text>
          {t("course.previewDefault.confirmDesc")} {t("common.confirm")?.toLowerCase()} thay đổi thành{" "}
          <strong>{enabled ? `${percent ?? 0}%` : "0%"}</strong>?
        </Typography.Text>
      </Modal>
    </>
  );
}
