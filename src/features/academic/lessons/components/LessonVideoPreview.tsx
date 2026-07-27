import { useEffect, useRef, useState } from "react";
import { Alert, Skeleton } from "antd";
import Hls from "hls.js";
import { useI18n } from "../../../../shared/i18n";
import { useLessonStream } from "../api/lessons.api";

interface LessonVideoPreviewProps {
  lessonId: string;
  /** Khi true và không có stream (bài không phải video / ngoài quyền) → render null, không hiện alert. */
  hideWhenEmpty?: boolean;
}

/** Gateway stream legacy Funnycode: resolve token `video_*` → HLS manifest ký sẵn. */
const STREAM_BASE =
  (import.meta.env.VITE_STREAM_BASE as string | undefined) ?? "https://stream.ftes.vn";

/** videoRef là token nội bộ `video_*` (khoá self-hosted legacy) chứ không phải URL/HLS manifest thật. */
export function isSelfHostedToken(videoRef: string | null | undefined): boolean {
  return !!videoRef && /^\s*video_/.test(videoRef);
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

interface PlaylistResponse {
  cdnPlaylistUrl?: string;
  presignedUrl?: string;
  proxyPlaylistUrl?: string;
}

/**
 * Player cho khoá self-hosted LEGACY: `videoRef` là token `video_*` (không phải HLS manifest thật).
 * Resolve token qua gateway stream ({VITE_STREAM_BASE|stream.ftes.vn}/api/videos/{ref}/playlist?
 * presign=true) → master.m3u8 ký sẵn rồi phát (native HLS Safari / hls.js Chrome-Firefox). Đây là
 * cặp FE của BE C1 (StreamViewResponse FULL self-hosted trả url=null + videoRef=video_* thay vì URL
 * chết). Endpoint playlist không auth: paywall đã gác ở BE (chỉ ship videoRef khi bài truy cập được).
 */
function SelfHostedHlsPlayer({ videoRef }: { videoRef: string }) {
  const { t } = useI18n();
  const el = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const video = el.current;
    if (!video) return;
    let hls: Hls | null = null;
    let cancelled = false;
    setFailed(false);
    setLoading(true);

    const play = async () => {
      try {
        const res = await fetch(
          `${STREAM_BASE}/api/videos/${encodeURIComponent(videoRef)}/playlist?presign=true`
        );
        if (!res.ok) throw new Error(`playlist ${res.status}`);
        const data = (await res.json()) as PlaylistResponse;
        const src = data.cdnPlaylistUrl ?? data.presignedUrl;
        if (!src || cancelled) throw new Error("no playlist url");
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.addEventListener("loadedmetadata", () => !cancelled && setLoading(false), {
            once: true,
          });
          video.src = src;
        } else if (Hls.isSupported()) {
          hls = new Hls({ enableWorker: true });
          hls.on(Hls.Events.MANIFEST_PARSED, () => !cancelled && setLoading(false));
          hls.on(Hls.Events.ERROR, (_e, d) => {
            if (d.fatal && !cancelled) {
              setFailed(true);
              setLoading(false);
            }
          });
          hls.loadSource(src);
          hls.attachMedia(video);
        } else if (!cancelled) {
          video.src = src;
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      }
    };
    void play();

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [videoRef]);

  if (failed) {
    return (
      <Alert
        type="info"
        showIcon
        message={t("lesson.videoPreview.noSource")}
        description={t("lesson.videoPreview.noSourceDesc")}
      />
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <video
        ref={el}
        controls
        playsInline
        style={{ width: "100%", maxHeight: 480, background: "#000", borderRadius: 6 }}
      />
      {loading && (
        <Skeleton.Node active style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      )}
    </div>
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

  // READY: BE ký sẵn URL từ hlsManifestKey → phát thẳng.
  if (stream.url) {
    return <HlsPlayer url={stream.url} />;
  }

  // Khoá self-hosted LEGACY (BE C1): url=null, provider≠YOUTUBE, videoRef=token `video_*` → resolve
  // qua gateway stream rồi phát. Không có nhánh này thì player trắng cho khoá Funnycode cũ.
  if (stream.provider !== "YOUTUBE" && isSelfHostedToken(stream.videoRef)) {
    return <SelfHostedHlsPlayer videoRef={(stream.videoRef as string).trim()} />;
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
