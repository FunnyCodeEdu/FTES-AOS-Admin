import { useEffect, useState } from "react";
import { Button, Card, Input, Modal, Space, Typography, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useI18n } from "../../../../shared/i18n";
import {
  useCoursePreviewDefault,
  useUpdateCoursePreviewDefault,
} from "../api/lessons.api";

interface CoursePreviewDefaultConfigProps {
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

export function CoursePreviewDefaultConfig({ courseId }: CoursePreviewDefaultConfigProps) {
  const { t } = useI18n();
  const { data: courseDefault } = useCoursePreviewDefault(courseId);
  const update = useUpdateCoursePreviewDefault(courseId);
  const [inputValue, setInputValue] = useState("15:00");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState<number | null>(null);

  useEffect(() => {
    if (courseDefault) {
      setInputValue(secondsToMmss(courseDefault.previewSeconds));
    }
  }, [courseDefault]);

  const handleSave = () => {
    const value = mmssToSeconds(inputValue);
    if (value === null) {
      message.error(t("lesson.preview.invalidFormat"));
      return;
    }
    setPendingValue(value);
    setIsModalOpen(true);
  };

  const handleConfirm = () => {
    if (pendingValue === null) return;
    update.mutate(
      { previewSeconds: pendingValue },
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
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
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
          <strong>{inputValue}</strong>?
        </Typography.Text>
      </Modal>
    </>
  );
}
