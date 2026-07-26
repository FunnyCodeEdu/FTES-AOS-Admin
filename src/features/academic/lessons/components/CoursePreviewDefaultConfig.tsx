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

function formatMmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Mặc định học thử CẤP KHOÁ (model B): áp cho bài chưa ghi đè. Phần trăm cho DOCUMENT
 * (defaultPreviewPercent) và số giây cho VIDEO (defaultPreviewSeconds). Quy ước:
 *   - BẬT = gửi giá trị > 0 (ít nhất MỘT trong hai đơn vị; đơn vị bỏ trống không gửi → BE giữ nguyên).
 *   - TẮT = gửi 0 cho CẢ HAI (BE: "0 = tắt"). KHÔNG gửi NULL: BE validate 400 (both-null) và null chỉ
 *     nghĩa là "giữ nguyên", không tắt được — trước đây gửi null nên nút Tắt luôn lỗi 400.
 */
export function CoursePreviewDefaultConfig({ courseId }: CoursePreviewDefaultConfigProps) {
  const { t } = useI18n();
  const { data: courseDefault } = useCoursePreviewDefault(courseId);
  const update = useUpdateCoursePreviewDefault(courseId);
  const [enabled, setEnabled] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!courseDefault) return;
    const p = courseDefault.defaultPreviewPercent ?? 0;
    const s = courseDefault.previewSeconds ?? 0;
    setEnabled(p > 0 || s > 0);
    setPercent(p > 0 ? p : null);
    setSeconds(s > 0 ? s : null);
  }, [courseDefault]);

  const handleSave = () => {
    if (enabled) {
      // Cho phép lưu chỉ MỘT đơn vị: khoá full-DOCUMENT chỉ cần %, khoá full-VIDEO chỉ cần giây.
      if (percent != null && (percent <= 0 || percent > 100)) {
        message.error(t("lesson.preview.invalidPercent"));
        return;
      }
      if (seconds != null && seconds <= 0) {
        message.error("Số giây học thử mặc định phải lớn hơn 0");
        return;
      }
      const hasPercent = percent != null && percent > 0;
      const hasSeconds = seconds != null && seconds > 0;
      if (!hasPercent && !hasSeconds) {
        message.error("Nhập ít nhất một: phần trăm (tài liệu) hoặc số giây (video)");
        return;
      }
    }
    setIsModalOpen(true);
  };

  const handleConfirm = () => {
    // BẬT = giá trị đã nhập (đơn vị bỏ trống → undefined, không gửi → BE giữ nguyên). TẮT = 0 cho cả
    // hai (BE "0 = tắt"). KHÔNG gửi null (BE 400 both-null / null = giữ nguyên, không tắt được).
    const hasPercent = percent != null && percent > 0;
    const hasSeconds = seconds != null && seconds > 0;
    update.mutate(
      {
        defaultPreviewPercent: enabled ? (hasPercent ? percent : undefined) : 0,
        defaultPreviewSeconds: enabled ? (hasSeconds ? seconds : undefined) : 0,
      },
      {
        onSuccess: () => {
          message.success(t("course.previewDefault.saveSuccess"));
          setIsModalOpen(false);
        },
        onError: (err: Error) => message.error(err.message || t("common.save") + " thất bại"),
      }
    );
  };

  const handleCancel = () => setIsModalOpen(false);

  return (
    <>
      <Card title={t("course.previewDefault.title")} style={{ maxWidth: 480, marginTop: 24 }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>{t("course.previewDefault.description")}</Typography.Text>
          <Switch
            checked={enabled}
            onChange={(checked) => {
              setEnabled(checked);
              if (checked) {
                setPercent((v) => v ?? 10);
                setSeconds((v) => v ?? 60);
              }
            }}
            checkedChildren={t("lesson.preview.enabled")}
            unCheckedChildren={t("lesson.preview.disabled")}
          />
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary">Tài liệu (DOCUMENT): phần trăm nội dung</Typography.Text>
            <InputNumber
              value={percent ?? undefined}
              onChange={(v) => setPercent(typeof v === "number" ? v : null)}
              disabled={!enabled}
              min={1}
              max={100}
              formatter={(v) => `${v}%`}
              parser={(v) => (v ? Number(v.replace("%", "")) : 0)}
              style={{ width: 220 }}
            />
          </Space>
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary">Video: số giây đầu</Typography.Text>
            <InputNumber
              value={seconds ?? undefined}
              onChange={(v) => setSeconds(typeof v === "number" ? v : null)}
              disabled={!enabled}
              min={1}
              addonAfter="giây"
              style={{ width: 220 }}
            />
            {enabled && seconds ? (
              <Typography.Text type="secondary">≈ {formatMmss(seconds)}</Typography.Text>
            ) : null}
          </Space>
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
          {t("course.previewDefault.confirmDesc")}{" "}
          {enabled ? (
            <strong>
              {percent ?? 0}% (tài liệu) · {seconds ? formatMmss(seconds) : "00:00"} (video)
            </strong>
          ) : (
            <strong>tắt học thử mặc định</strong>
          )}
          ?
        </Typography.Text>
      </Modal>
    </>
  );
}
