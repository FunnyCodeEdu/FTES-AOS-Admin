import { useEffect, useState } from "react";
import { Button, Card, InputNumber, Space, Switch, Typography, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useI18n } from "../../../../shared/i18n";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import { useLessonPreview, useUpdateLessonMeta, useUpdateLessonPreview } from "../api/lessons.api";
import type { LessonType } from "../types";

interface LessonTrialConfigProps {
  lessonId: string;
  courseId?: string;
  lessonType: LessonType;
  disabled?: boolean;
}

function formatMmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Cấu hình học thử THEO BÀI (model B): DOCUMENT học thử theo % nội dung (preview_percent), VIDEO học
 * thử theo số giây đầu (preview_seconds). Quy ước hợp đồng: BẬT = ghi giá trị > 0; TẮT = ghi NULL để
 * kế thừa mặc định khoá — TUYỆT ĐỐI không ghi 0 (0 = NONE, bài sẽ không mở được ở màn học). Đồng thời
 * set cờ `free` của bài (PATCH /courses/lessons/{id}) khớp trạng thái bật/tắt.
 *
 * Chỉ hiển thị cho DOCUMENT/VIDEO — SLIDE/QUIZ không có cơ chế học thử.
 */
export function LessonTrialConfig({ lessonId, courseId, lessonType, disabled }: LessonTrialConfigProps) {
  const { t } = useI18n();
  const { data: preview } = useLessonPreview(lessonId, lessonType);
  const updatePreview = useUpdateLessonPreview(lessonId, courseId);
  const updateMeta = useUpdateLessonMeta(lessonId, courseId);

  const isVideo = lessonType === "VIDEO";
  const [enabled, setEnabled] = useState(false);
  // DOCUMENT: phần trăm; VIDEO: số giây. Giữ riêng để đổi loại không lẫn đơn vị.
  const [percent, setPercent] = useState<number | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!preview) return;
    if (isVideo) {
      const own = preview.previewSeconds ?? 0;
      setEnabled(own > 0);
      setSeconds(own > 0 ? own : null);
    } else {
      const own = preview.previewPercent ?? 0;
      setEnabled(own > 0);
      setPercent(own > 0 ? own : null);
    }
  }, [preview, isVideo]);

  const handleSave = () => {
    if (enabled) {
      if (isVideo) {
        if (!seconds || seconds <= 0) {
          message.error("Nhập số giây học thử lớn hơn 0");
          return;
        }
      } else if (!percent || percent <= 0 || percent > 100) {
        message.error(t("lesson.preview.invalidPercent"));
        return;
      }
    }
    // BẬT = giá trị > 0; TẮT = NULL (kế thừa mặc định khoá), không bao giờ 0.
    const previewBody = isVideo
      ? { previewSeconds: enabled ? seconds : null }
      : { previewPercent: enabled ? percent : null };

    updatePreview.mutate(previewBody, {
      onSuccess: () => {
        // Đồng bộ cờ free của bài với trạng thái học thử.
        updateMeta.mutate(
          { free: enabled },
          {
            onSuccess: () => message.success(t("lesson.preview.saveSuccess")),
            onError: handleAdminMutationError,
          }
        );
      },
      onError: handleAdminMutationError,
    });
  };

  const inheritLabel = preview
    ? isVideo
      ? `Mặc định khoá: ${formatMmss(preview.effectivePreviewSeconds)}`
      : `Mặc định khoá: ${preview.effectivePreviewPercent ?? 0}%`
    : "";

  return (
    <Card title="Thời gian học thử">
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Space>
          <Typography.Text>Cho học thử</Typography.Text>
          <Switch
            checked={enabled}
            disabled={disabled}
            onChange={(checked) => {
              setEnabled(checked);
              if (checked) {
                if (isVideo) setSeconds((v) => v ?? 60);
                else setPercent((v) => v ?? 10);
              }
            }}
            checkedChildren={t("lesson.preview.enabled")}
            unCheckedChildren={t("lesson.preview.disabled")}
          />
        </Space>

        {isVideo ? (
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary">Số giây đầu video được xem thử</Typography.Text>
            <InputNumber
              value={seconds ?? undefined}
              onChange={(v) => setSeconds(typeof v === "number" ? v : null)}
              disabled={disabled || !enabled}
              min={1}
              addonAfter="giây"
              style={{ width: 220 }}
            />
            {enabled && seconds ? (
              <Typography.Text type="secondary">≈ {formatMmss(seconds)}</Typography.Text>
            ) : null}
          </Space>
        ) : (
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary">Phần trăm nội dung tài liệu được đọc thử</Typography.Text>
            <InputNumber
              value={percent ?? undefined}
              onChange={(v) => setPercent(typeof v === "number" ? v : null)}
              disabled={disabled || !enabled}
              min={1}
              max={100}
              formatter={(v) => `${v}%`}
              parser={(v) => (v ? Number(v.replace("%", "")) : 0)}
              style={{ width: 220 }}
            />
          </Space>
        )}

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Tắt = kế thừa mặc định khoá học ({inheritLabel}). Bật và đặt giá trị {'>'} 0 để ghi đè riêng bài này.
        </Typography.Text>

        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={updatePreview.isPending || updateMeta.isPending}
          disabled={disabled}
        >
          {t("common.save")}
        </Button>
      </Space>
    </Card>
  );
}
