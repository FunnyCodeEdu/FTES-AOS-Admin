import { useEffect, useRef } from "react";
import { Alert, Skeleton } from "antd";
import Hls from "hls.js";
import { useI18n } from "../../../../shared/i18n";
import { useLessonStream } from "../api/lessons.api";

interface LessonVideoPreviewProps {
  lessonId: string;
  /** Khi true và không có stream (bài không phải video / ngoài quyền) → render null, không hiện alert. */
  hideWhenEmpty?: boolean;
}

/** Suy id YouTube từ `videoRef` (chấp nhận id trần hoặc URL youtube/youtu.be). */
function youtubeId(videoRef: string): string {
  const trimmed = videoRef.trim();
  const patterns = [/[?&]v=([^&]+)/, /youtu\.be\/([^?&/]+)/, /youtube\.com\/embed\/([^?&/]+)/];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m?.[1]) return m[1];
  }
  return trimmed;
}

/** Player HLS: hls.js khi trình duyệt không hỗ trợ native (Chrome/Firefox); native src cho Safari. */
function HlsPlayer({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Safari/iOS phát HLS native — gán thẳng src, không cần hls.js.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(url);
      hls.attachMedia(video);
      return () => hls.destroy();
    }

    // Không hỗ trợ MSE lẫn native → thử gán trực tiếp (best-effort).
    video.src = url;
  }, [url]);

  return (
    <video
      ref={videoRef}
      controls
      style={{ width: "100%", maxHeight: 480, background: "#000", borderRadius: 6 }}
    />
  );
}

/**
 * Xem trước video của bài học. Provider HLS → hls.js; provider YOUTUBE → iframe nhúng theo videoRef.
 * 403/không có video → hook trả null → hiển thị thông báo dịu (không phải lỗi).
 */
export function LessonVideoPreview({ lessonId, hideWhenEmpty }: LessonVideoPreviewProps) {
  const { t } = useI18n();
  const { data: stream, isLoading, isError, error } = useLessonStream(lessonId);

  if (isLoading) return <Skeleton.Node active style={{ width: "100%", height: 240 }} />;

  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        message={t("lesson.videoPreview.loadError")}
        description={error?.message}
      />
    );
  }

  if (!stream) {
    if (hideWhenEmpty) return null;
    return (
      <Alert
        type="info"
        showIcon
        message={t("lesson.videoPreview.empty")}
        description={t("lesson.videoPreview.emptyDesc")}
      />
    );
  }

  if (stream.provider === "YOUTUBE" && stream.videoRef) {
    return (
      <div style={{ position: "relative", paddingTop: "56.25%" }}>
        <iframe
          title={t("lesson.contentPreview.tab")}
          src={`https://www.youtube-nocookie.com/embed/${youtubeId(stream.videoRef)}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            border: 0,
            borderRadius: 6,
          }}
        />
      </div>
    );
  }

  if (stream.url) {
    return <HlsPlayer url={stream.url} />;
  }

  return (
    <Alert
      type="info"
      showIcon
      message={t("lesson.videoPreview.noSource")}
      description={t("lesson.videoPreview.noSourceDesc")}
    />
  );
}
