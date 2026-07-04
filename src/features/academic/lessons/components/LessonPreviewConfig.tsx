import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Checkbox, Input, Space, Typography, message } from "antd";
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

function secondsToMmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function mmssToSeconds(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const [m, s] = trimmed.split(":").map((part) => parseInt(part, 10));
  if (Number.isNaN(m) || Number.isNaN(s)) return null;
  return m * 60 + s;
}

export function LessonPreviewConfig({ lessonId, courseId }: LessonPreviewConfigProps) {
  const { t } = useI18n();
  const { data: preview } = useLessonPreview(lessonId, "VIDEO");
  const { data: courseDefault } = useCoursePreviewDefault(courseId);
  const update = useUpdateLessonPreview(lessonId, courseId);
  const [inputValue, setInputValue] = useState("");
  const [disabled, setDisabled] = useState(false);

  const inherited = courseDefault?.previewSeconds ?? 15 * 60;

  useEffect(() => {
    if (preview) {
      setDisabled(preview.previewSeconds === 0);
      if (preview.previewSeconds === null) {
        setInputValue("");
      } else if (preview.previewSeconds === 0) {
        setInputValue("00:00");
      } else {
        setInputValue(secondsToMmss(preview.previewSeconds));
      }
    }
  }, [preview]);

  const placeholder = useMemo(
    () => t("lesson.preview.placeholder", { value: secondsToMmss(inherited) }),
    [inherited, t]
  );

  const handleToggle = (checked: boolean) => {
    setDisabled(checked);
    if (checked) {
      setInputValue("00:00");
    } else {
      setInputValue(preview?.previewSeconds ? secondsToMmss(preview.previewSeconds) : "");
    }
  };

  const handleSave = () => {
    let value: number | null = null;
    if (disabled) {
      value = 0;
    } else if (inputValue.trim()) {
      value = mmssToSeconds(inputValue);
      if (value === null) {
        message.error(t("lesson.preview.invalidFormat"));
        return;
      }
      const duration = preview?.videoDurationSeconds ?? 0;
      if (preview?.videoStatus === "ready" && duration > 0 && value > duration) {
        message.error(t("lesson.preview.exceedsDuration", { value: secondsToMmss(duration) }));
        return;
      }
    }

    update.mutate(
      { previewSeconds: value },
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
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={{ width: 200 }}
        />
        <Checkbox checked={disabled} onChange={(e) => handleToggle(e.target.checked)}>
          {t("lesson.preview.disable")}
        </Checkbox>
        <Typography.Text type="secondary">{t("lesson.preview.hint")}</Typography.Text>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={update.isPending}>
          {t("common.save")}
        </Button>
      </Space>
    </Card>
  );
}
