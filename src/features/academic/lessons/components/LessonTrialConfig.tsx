import { useEffect, useState } from "react";
import { Button, Card, InputNumber, Space, Switch, Typography, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useI18n } from "../../../../shared/i18n";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import { useLessonPreview, useUpdateLessonPreview } from "../api/lessons.api";
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
 * thử theo số giây đầu (preview_seconds). Quy ước:
 *   - BẬT = ghi giá trị > 0 (override riêng bài này).
 *   - TẮT = ghi 0 = TẮT TƯỜNG MINH bài này (BE: effectivePreview = 0 → không cho học thử bài này).
 *
 * KHÔNG bao giờ ghi cờ `free`: `free=true` ở BE nghĩa là bài MIỄN PHÍ HOÀN TOÀN (FULL access cho mọi
 * người), làm rò rỉ 100% nội dung và vô hiệu paywall — hoàn toàn khác "học thử". Học thử chỉ do
 * preview_percent/preview_seconds quyết định. Muốn "bài miễn phí" phải dùng control riêng, có cảnh báo.
 *
 * LƯU Ý cross-repo: BE hiện KHÔNG có cơ chế xoá override về NULL (kế thừa mặc định khoá): `null` bị
 * validate 400 (both-null) và cũng chỉ nghĩa là "giữ nguyên", không xoá. Vì vậy TẮT ở đây = ghi 0 =
 * "không học thử bài này", KHÔNG phải "kế thừa mặc định khoá". Cần BE bổ sung cờ clear để làm được inherit.
 *
 * Chỉ hiển thị cho DOCUMENT/VIDEO — SLIDE/QUIZ không có cơ chế học thử.
 */
export function LessonTrialConfig({ lessonId, courseId, lessonType, disabled }: LessonTrialConfigProps) {
  const { t } = useI18n();
  const { data: preview } = useLessonPreview(lessonId, lessonType);
  const updatePreview = useUpdateLessonPreview(lessonId, courseId);

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
    // BẬT = giá trị > 0 (override); TẮT = 0 (tắt tường minh). KHÔNG gửi null: BE 400 (both-null) và
    // null = "giữ nguyên", không xoá được override. KHÔNG động tới cờ `free` (free = miễn phí FULL).
    const previewBody = isVideo
      ? { previewSeconds: enabled ? seconds : 0 }
      : { previewPercent: enabled ? percent : 0 };

    updatePreview.mutate(previewBody, {
      onSuccess: () => message.success(t("lesson.preview.saveSuccess")),
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
          Bật và đặt giá trị {'>'} 0 để cho học thử riêng bài này. Tắt = KHÔNG cho học thử bài này.
          Mặc định khoá hiện tại: {inheritLabel}. (Chưa hỗ trợ xoá override để kế thừa lại mặc định khoá.)
        </Typography.Text>

        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={updatePreview.isPending}
          disabled={disabled}
        >
          {t("common.save")}
        </Button>
      </Space>
    </Card>
  );
}
