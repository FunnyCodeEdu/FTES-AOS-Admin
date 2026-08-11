import { ApiError } from "../../../../shared/api/client";

/**
 * Lập kế hoạch + chạy vòng tải ALBUM ẢNH cho học liệu `type = FE`
 * (change admin-fe-album-image-upload).
 *
 * Học liệu FE KHÔNG còn là một file zip: mỗi ảnh là một dòng `resource.fe_images` với `sortOrder`,
 * caption và luồng bình luận riêng, nạp TỪNG TẤM qua `POST /api/v1/resources/{id}/images`.
 * Mọi hằng số dưới đây phản chiếu BE (`FTES-AOS-Backend@origin/main`) — lệch là ăn 4xx giữa lượt tải:
 *   - `FeAlbumService.MAX_IMAGES_PER_ALBUM = 50`, `MAX_IMAGE_BYTES = 10MB`,
 *     `ALLOWED_IMAGE_MIME = image/png|image/jpeg|image/webp`
 *   - `ResourceExamRateLimiter.checkFeImageUpload`: 10 ảnh/PHÚT và 60 ảnh/GIỜ mỗi user.
 *
 * File này cố ý KHÔNG chạm React/axios: vào là `File[]` + hàm upload do caller tiêm, ra là kế hoạch
 * và kết quả — nhờ vậy luật (thứ tự, trần, bỏ file, nhịp, backoff 429, huỷ) test được bằng vitest.
 */

/** Trần ảnh mỗi album. Chỉ là MẶC ĐỊNH — sự thật là `FeAlbumView.maxImages` server trả về. */
export const FE_ALBUM_MAX_IMAGES = 50;

/** Trần bytes mỗi ảnh (BE `FeAlbumService.MAX_IMAGE_BYTES`). */
export const FE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** MIME ảnh BE nhận cho album FE (khớp phần ảnh của `ResourceType.FE`). KHÔNG có gif. */
export const FE_ALBUM_ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"] as const;

/**
 * Khoảng cách TỐI THIỂU giữa hai request (tính từ lúc BẮT ĐẦU request trước).
 *
 * Limiter của BE là cửa sổ CỐ ĐỊNH 60s (Redis INCR + EXPIRE lần đầu), nên với khoảng cách `T` thì số
 * request rơi vào một cửa sổ bất kỳ tối đa là `floor(60/T) + 1`: T=6,0s → 11 (VƯỢT trần 10), T=6,5s
 * → 10 (khít). Chọn 6,5s = chậm nhất có thể chấp nhận nhưng an toàn kể cả khi cửa sổ cắt ngang lượt.
 */
export const FE_UPLOAD_MIN_INTERVAL_MS = 6_500;

/** Lùi rồi thử lại CHÍNH tấm bị 429 (không bỏ cả lượt). Hết bậc mới chịu thua. */
export const FE_UPLOAD_BACKOFF_MS = [10_000, 20_000, 40_000, 60_000];

/** Số tên file ví dụ kèm theo mỗi dòng cảnh báo — đủ để nhận ra, không đủ để ngập UI. */
const SAMPLE_LIMIT = 5;

/** Đuôi file → MIME, chỉ dùng khi trình duyệt trả `file.type` rỗng (hay gặp trên Windows). */
const IMAGE_EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export type FeSkipReason = "not-image" | "too-large" | "empty" | "over-cap";

export interface FeAlbumUploadItem {
  file: File;
  /** Đường dẫn tương đối trong thư mục đã chọn (hoặc tên file) — cũng là khoá sắp xếp. */
  path: string;
  /** MIME khai với BE (ưu tiên `file.type`, fallback theo đuôi). */
  mimeType: string;
}

export interface FeAlbumSkip {
  reason: FeSkipReason;
  count: number;
  samples: string[];
}

export interface FeAlbumPlan {
  /** Danh sách sẽ tải, ĐÃ sắp thứ tự tự nhiên và ĐÃ cắt theo chỗ trống của album. */
  items: FeAlbumUploadItem[];
  /** Tổng số file người dùng chọn (mọi loại). */
  picked: number;
  /** File không tải, gom theo lý do — luôn hiển thị, không bao giờ bỏ im lặng. */
  skipped: FeAlbumSkip[];
  /** Chỗ trống của album lúc lập kế hoạch (`maxImages - total`). */
  capacity: number;
}

/** Đường dẫn tương đối của file trong thư mục đã chọn (input `webkitdirectory`). */
export function relativePath(file: File): string {
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return rel && rel.length > 0 ? rel : file.name;
}

/**
 * MIME ảnh hợp lệ của file, hoặc `null` nếu không phải ảnh BE nhận.
 *
 * Ưu tiên `file.type` của trình duyệt vì BE còn đối chiếu MAGIC BYTES với MIME client khai
 * (`ImageSignature.matchesDeclared`) — đoán theo đuôi khi trình duyệt ĐÃ biết kiểu thật là tự bắn vào
 * chân mình với những file đặt sai đuôi.
 */
export function feImageMime(file: File): string | null {
  const declared = (file.type || "").toLowerCase().trim();
  if ((FE_ALBUM_ALLOWED_MIME as readonly string[]).includes(declared)) return declared;
  if (declared) return null; // trình duyệt biết kiểu và kiểu đó không được nhận → khỏi đoán lại
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXT_MIME[ext] ?? null;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/**
 * So sánh "tự nhiên" (người đọc): `de2` TRƯỚC `de10`. Thứ tự này quyết định `sortOrder` BE đóng dấu,
 * tức thứ tự trang của album trên trang học viên — sắp sai là album lộn trang.
 */
export function naturalCompare(a: string, b: string): number {
  const byName = collator.compare(a, b);
  return byName !== 0 ? byName : a < b ? -1 : a > b ? 1 : 0;
}

function pushSkip(map: Map<FeSkipReason, FeAlbumSkip>, reason: FeSkipReason, name: string) {
  const entry = map.get(reason) ?? { reason, count: 0, samples: [] };
  entry.count += 1;
  if (entry.samples.length < SAMPLE_LIMIT) entry.samples.push(name);
  map.set(reason, entry);
}

/**
 * Lọc ảnh hợp lệ khỏi thư mục đã chọn, sắp tự nhiên theo đường dẫn, cắt theo `capacity`
 * (= `maxImages - total` của album) và gom MỌI file bị bỏ theo lý do.
 *
 * Lọc ở client KHÔNG phải để thay validate của BE mà để không đốt quota rate-limit (10 ảnh/phút) vào
 * những file chắc chắn bị từ chối — và để admin biết TRƯỚC khi ngồi chờ 5 phút.
 */
export function planFeAlbumUpload(
  files: File[],
  capacity: number = FE_ALBUM_MAX_IMAGES
): FeAlbumPlan {
  const room = Math.max(0, Math.floor(capacity));
  const skips = new Map<FeSkipReason, FeAlbumSkip>();
  const candidates: FeAlbumUploadItem[] = [];

  for (const file of files) {
    const path = relativePath(file);
    const mimeType = feImageMime(file);
    if (!mimeType) {
      pushSkip(skips, "not-image", path);
      continue;
    }
    if (file.size === 0) {
      pushSkip(skips, "empty", path);
      continue;
    }
    if (file.size > FE_IMAGE_MAX_BYTES) {
      pushSkip(skips, "too-large", path);
      continue;
    }
    candidates.push({ file, path, mimeType });
  }

  candidates.sort((a, b) => naturalCompare(a.path, b.path));

  const items = candidates.slice(0, room);
  for (const dropped of candidates.slice(room)) {
    pushSkip(skips, "over-cap", dropped.path);
  }

  return {
    items,
    picked: files.length,
    // Thứ tự cố định để UI không nhảy: trần trước (nghiêm trọng nhất), rồi tới lý do từng file.
    skipped: (["over-cap", "not-image", "too-large", "empty"] as FeSkipReason[])
      .map((r) => skips.get(r))
      .filter((s): s is FeAlbumSkip => Boolean(s)),
    capacity: room,
  };
}

function samplesOf(skip: FeAlbumSkip): string {
  const shown = skip.samples.join(", ");
  return skip.count > skip.samples.length ? `${shown}, …` : shown;
}

/** Cảnh báo tiếng Việt cho từng nhóm file bị bỏ — số lượng + lý do + vài tên ví dụ. */
export function describePlanWarnings(plan: FeAlbumPlan): string[] {
  return plan.skipped.map((skip) => {
    switch (skip.reason) {
      case "over-cap":
        return `Album chỉ còn ${plan.capacity} chỗ → bỏ lại ${skip.count} ảnh cuối theo thứ tự tên (${samplesOf(skip)}).`;
      case "not-image":
        return `${skip.count} tệp không phải ảnh png/jpeg/webp nên không tải (${samplesOf(skip)}).`;
      case "too-large":
        return `${skip.count} ảnh vượt ${FE_IMAGE_MAX_BYTES / (1024 * 1024)}MB nên không tải (${samplesOf(skip)}).`;
      case "empty":
        return `${skip.count} tệp rỗng (0 byte) nên không tải (${samplesOf(skip)}).`;
      default:
        return `${skip.count} tệp không tải được (${samplesOf(skip)}).`;
    }
  });
}

/** Ước tính thời gian chạy: nhịp chống rate-limit CỘNG thời gian truyền đoán ~1,5s mỗi ảnh. */
export function estimateUploadSeconds(
  count: number,
  intervalMs: number = FE_UPLOAD_MIN_INTERVAL_MS
): number {
  if (count <= 0) return 0;
  return Math.round(((count - 1) * intervalMs) / 1000) + count * 2;
}

/** "~5 phút" / "~40 giây" — nói trước để admin không tưởng modal treo. */
export function formatDuration(seconds: number): string {
  if (seconds < 90) return `~${Math.max(1, Math.round(seconds))} giây`;
  return `~${Math.max(1, Math.round(seconds / 60))} phút`;
}

/**
 * Lỗi 429 của BE. Envelope lỗi resource là `{code, message: "MÃ: chi tiết", data: null}`
 * (`ResourceExceptionHandler`) nên mã nằm trong MESSAGE chứ không ở `data.errorCode` — nhận diện cả
 * hai đường để không phụ thuộc một chỗ.
 */
export function isFeRateLimitError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.code === 429) return true;
  if (error.errorCode === "RESOURCE_RATE_LIMITED") return true;
  return (error.message ?? "").includes("RESOURCE_RATE_LIMITED");
}

export type FeRunOutcome = "done" | "cancelled" | "failed";

export interface FeRunProgress {
  /** Vị trí 0-based trong danh sách của lượt chạy này. */
  index: number;
  total: number;
  /** Số ảnh ĐÃ nằm trên server trong lượt này. */
  uploaded: number;
  name: string;
  state: "uploading" | "waiting" | "retrying";
  waitMs?: number;
  /** Lần thử lại thứ mấy sau 429 (1-based). */
  attempt?: number;
  maxAttempts?: number;
}

export interface FeRunDeps {
  upload: (item: FeAlbumUploadItem, index: number) => Promise<void>;
  /** Chờ — phải kết thúc SỚM khi bị huỷ để nút "Dừng" phản hồi ngay. */
  sleep: (ms: number) => Promise<void>;
  now?: () => number;
  onProgress?: (progress: FeRunProgress) => void;
  isCancelled?: () => boolean;
  minIntervalMs?: number;
  backoffMs?: number[];
}

export interface FeRunResult {
  /** Số ảnh THẬT SỰ đã nạp trong lượt này (dùng để báo cáo + nạp tiếp). */
  uploaded: number;
  total: number;
  outcome: FeRunOutcome;
  /** Lỗi làm dừng lượt (outcome = "failed"). */
  error?: unknown;
}

/**
 * Nạp tuần tự từng ảnh, giữ nhịp dưới rate limit, lùi-thử-lại khi 429, dừng được giữa chừng.
 *
 * Ba luật không nhân nhượng:
 *  1. TUẦN TỰ — bắn song song là ăn 429 ngay ở ảnh thứ 11 và làm `sortOrder` lộn thứ tự.
 *  2. 429 KHÔNG phải lỗi kết thúc — chờ rồi thử lại CHÍNH tấm đó, hết bậc backoff mới chịu thua.
 *  3. Dừng/thua đều trả `uploaded` THẬT để caller nói được "đã tải N/M" và nạp tiếp từ đúng chỗ.
 */
export async function runFeAlbumUpload(
  items: FeAlbumUploadItem[],
  deps: FeRunDeps
): Promise<FeRunResult> {
  const {
    upload,
    sleep,
    now = () => Date.now(),
    onProgress,
    isCancelled = () => false,
    minIntervalMs = FE_UPLOAD_MIN_INTERVAL_MS,
    backoffMs = FE_UPLOAD_BACKOFF_MS,
  } = deps;

  const total = items.length;
  let uploaded = 0;
  let lastStartedAt: number | null = null;

  for (let index = 0; index < total; index += 1) {
    const item = items[index];
    if (isCancelled()) return { uploaded, total, outcome: "cancelled" };

    // Nhịp tính từ lúc BẮT ĐẦU request trước (server đếm theo lúc request tới, không theo lúc xong).
    const waitMs = lastStartedAt === null ? 0 : minIntervalMs - (now() - lastStartedAt);
    if (waitMs > 0) {
      onProgress?.({ index, total, uploaded, name: item.path, state: "waiting", waitMs });
      await sleep(waitMs);
      if (isCancelled()) return { uploaded, total, outcome: "cancelled" };
    }

    let attempt = 0;
    for (;;) {
      lastStartedAt = now();
      onProgress?.({ index, total, uploaded, name: item.path, state: "uploading" });
      try {
        await upload(item, index);
        uploaded += 1;
        break;
      } catch (error) {
        if (isCancelled()) return { uploaded, total, outcome: "cancelled" };
        if (isFeRateLimitError(error) && attempt < backoffMs.length) {
          const delay = backoffMs[attempt];
          attempt += 1;
          onProgress?.({
            index,
            total,
            uploaded,
            name: item.path,
            state: "retrying",
            waitMs: delay,
            attempt,
            maxAttempts: backoffMs.length,
          });
          await sleep(delay);
          if (isCancelled()) return { uploaded, total, outcome: "cancelled" };
          continue;
        }
        return { uploaded, total, outcome: "failed", error };
      }
    }
  }

  return { uploaded, total, outcome: "done" };
}
