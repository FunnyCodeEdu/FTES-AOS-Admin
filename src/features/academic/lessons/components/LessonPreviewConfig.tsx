import { useEffect, useState } from "react";
import { Alert, Button, Card, InputNumber, Space, Switch, Typography, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useI18n } from "../../../../shared/i18n";
import {
  useCoursePreviewDefault,
  useLessonPreview,
  useUpdateLessonPreview,
} from "../api/lessons.api";

interface LessonPreviewConfigProps {
  lessonId: string;
  courseId: string;
}

export function LessonPreviewConfig({ lessonId, courseId }: LessonPreviewConfigProps) {
  const { t } = useI18n();
  const { data: preview } = useLessonPreview(lessonId, "VIDEO");
  const { data: courseDefault } = useCoursePreviewDefault(courseId);
  const update = useUpdateLessonPreview(lessonId, courseId);
  const [percent, setPercent] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(false);

  const inheritedPercent = courseDefault?.previewPercent ?? 0;

  useEffect(() => {
    if (preview) {
      const current = preview.previewPercent ?? 0;
      setEnabled(current > 0);
      setPercent(current > 0 ? current : null);
    }
  }, [preview]);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (checked) {
      setPercent(percent ?? inheritedPercent ?? 10);
    }
  };

  const handleSave = () => {
    const value = enabled ? percent ?? 0 : 0;
    if (enabled && (value <= 0 || value > 100)) {
      message.error(t("lesson.preview.invalidPercent"));
      return;
    }

    update.mutate(
      { previewPercent: value },
      {
        onSuccess: () => message.success(t("lesson.preview.saveSuccess")),
        onError: (err: Error) => message.error(err.message || t("common.save") + " thất bại"),
      }
    );
  };

  if (!preview || preview.lessonType !== "VIDEO") {
    return <Alert type="info" message="Cấu hình học thử chỉ áp dụng cho bài học dạng VIDEO" />;
  }

  return (
    <Card title={t("lesson.preview.title")} style={{ maxWidth: 480 }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Switch
          checked={enabled}
          onChange={handleToggle}
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
          placeholder={inheritedPercent > 0 ? `Mặc định: ${inheritedPercent}%` : undefined}
        />
        <Typography.Text type="secondary">{t("lesson.preview.percentHint")}</Typography.Text>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={update.isPending}>
          {t("common.save")}
        </Button>
      </Space>
    </Card>
  );
}
