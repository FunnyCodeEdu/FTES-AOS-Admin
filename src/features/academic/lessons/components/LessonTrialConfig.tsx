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
 * Cấu hình học thử THEO BÀI (model B) — video-preview-admin-gate: CẢ DOCUMENT lẫn VIDEO nay học thử
 * theo % (preview_percent). Trước đây VIDEO đi theo số GIÂY (preview_seconds), nhưng BE đã hợp nhất
 * cổng: một buổi video chỉ previewable khi Admin/giảng viên BẬT học thử TƯỜNG MINH với
 * `preview_percent > 0` (không còn tự bật theo cửa-sổ-giây mặc định 900). Với VIDEO, % là tỉ lệ thời
 * lượng đầu video được xem thử — BE tính cửa sổ = `% × thời lượng`. Quy ước:
 *   - BẬT = ghi giá trị > 0 (override riêng bài này).
 *   - TẮT = ghi 0 = TẮT TƯỜNG MINH bài này (BE: effectivePreviewPercent = 0 → không cho học thử).
 *
 * KHÔNG bao giờ ghi cờ `free`: `free=true` ở BE nghĩa là bài MIỄN PHÍ HOÀN TOÀN (FULL access cho mọi
 * người), làm rò rỉ 100% nội dung và vô hiệu paywall — hoàn toàn khác "học thử". Học thử chỉ do
 * preview_percent quyết định. Muốn "bài miễn phí" phải dùng control riêng, có cảnh báo.
 *
 * LƯU Ý cross-repo: BE hiện KHÔNG có cơ chế xoá override về NULL (kế thừa mặc định khoá): `null` bị
 * validate 400 (both-null) và cũng chỉ nghĩa là "giữ nguyên", không xoá. Vì vậy TẮT ở đây = ghi 0 =
 * "không học thử bài này", KHÔNG phải "kế thừa mặc định khoá". Cần BE bổ sung cờ clear để làm được inherit.
 * VIDEO chỉ đặt được preview_percent khi video đã XỬ LÝ XONG (READY) — BE 400 nếu chưa; UI chặn lưu sớm.
 *
 * Chỉ hiển thị cho DOCUMENT/VIDEO — SLIDE/QUIZ không có cơ chế học thử.
 */
export function LessonTrialConfig({ lessonId, courseId, lessonType, disabled }: LessonTrialConfigProps) {
  const { t } = useI18n();
  const { data: preview } = useLessonPreview(lessonId, lessonType);
  const updatePreview = useUpdateLessonPreview(lessonId, courseId);

  const isVideo = lessonType === "VIDEO";
  const [enabled, setEnabled] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);

  useEffect(() => {
    if (!preview) return;
    const own = preview.previewPercent ?? 0;
    setEnabled(own > 0);
    setPercent(own > 0 ? own : null);
  }, [preview]);

  // Video chỉ đặt được preview_percent khi đã READY (BE 400 nếu chưa) → chặn lưu + báo.
  const videoNotReady = isVideo && !!preview?.videoStatus && preview.videoStatus !== "ready";

  const handleSave = () => {
    if (enabled && (!percent || percent <= 0 || percent > 100)) {
      message.error(t("lesson.preview.invalidPercent"));
      return;
    }
    // BẬT = percent > 0 (override); TẮT = 0 (tắt tường minh). KHÔNG gửi null: BE 400 (both-null) và
    // null = "giữ nguyên", không xoá được override. KHÔNG động tới cờ `free` (free = miễn phí FULL).
    updatePreview.mutate(
      { previewPercent: enabled ? percent : 0 },
      {
        onSuccess: () => message.success(t("lesson.preview.saveSuccess")),
        onError: handleAdminMutationError,
      }
    );
  };

  const inheritLabel = preview ? `Mặc định khoá: ${preview.effectivePreviewPercent ?? 0}%` : "";
  // Video: quy đổi % → mm:ss theo thời lượng để giảng viên hình dung cửa sổ xem thử.
  const approxSeconds =
    isVideo && enabled && percent && preview?.videoDurationSeconds
      ? Math.round((preview.videoDurationSeconds * percent) / 100)
      : null;

  return (
    <Card title="Thời gian học thử">
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Space>
          <Typography.Text>Cho học thử</Typography.Text>
          <Switch
            checked={enabled}
            disabled={disabled || videoNotReady}
            onChange={(checked) => {
              setEnabled(checked);
              if (checked) setPercent((v) => v ?? 10);
            }}
            checkedChildren={t("lesson.preview.enabled")}
            unCheckedChildren={t("lesson.preview.disabled")}
          />
        </Space>

        <Space direction="vertical" size={4}>
          <Typography.Text type="secondary">
            {isVideo
              ? "Phần trăm thời lượng video được xem thử"
              : "Phần trăm nội dung tài liệu được đọc thử"}
          </Typography.Text>
          <InputNumber
            value={percent ?? undefined}
            onChange={(v) => setPercent(typeof v === "number" ? v : null)}
            disabled={disabled || !enabled || videoNotReady}
            min={1}
            max={100}
            formatter={(v) => `${v}%`}
            parser={(v) => (v ? Number(v.replace("%", "")) : 0)}
            style={{ width: 220 }}
          />
          {approxSeconds != null ? (
            <Typography.Text type="secondary">≈ {formatMmss(approxSeconds)}</Typography.Text>
          ) : null}
        </Space>

        {videoNotReady ? (
          <Typography.Text type="warning" style={{ fontSize: 12 }}>
            Video chưa xử lý xong — chỉ đặt được học thử khi video ở trạng thái sẵn sàng.
          </Typography.Text>
        ) : null}

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Bật và đặt giá trị {'>'} 0 để cho học thử riêng bài này. Tắt = KHÔNG cho học thử bài này.
          Mặc định khoá hiện tại: {inheritLabel}. (Chưa hỗ trợ xoá override để kế thừa lại mặc định khoá.)
        </Typography.Text>

        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={updatePreview.isPending}
          disabled={disabled || videoNotReady}
        >
          {t("common.save")}
        </Button>
      </Space>
    </Card>
  );
}
