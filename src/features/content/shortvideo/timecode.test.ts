import { describe, expect, it } from "vitest";
import {
  MAX_CLIP_MS,
  checkClipRange,
  formatBytes,
  formatDurationSeconds,
  formatMmSs,
  isValidClipRange,
  parseMmSs,
} from "./timecode";

// change admin-shortvideo-studio — luật mốc thời gian của clip.

describe("formatMmSs", () => {
  it("0 ms là 00:00, không phải chuỗi rỗng", () => {
    expect(formatMmSs(0)).toBe("00:00");
  });

  it("65 giây là 01:05 (đệm 0 cho cả phút lẫn giây)", () => {
    expect(formatMmSs(65_000)).toBe("01:05");
  });

  it("cắt phần lẻ mili-giây xuống, không làm tròn lên", () => {
    // 65.9s vẫn là 01:05 — làm tròn lên thành 01:06 nghĩa là hiện một mốc CHƯA tới.
    expect(formatMmSs(65_900)).toBe("01:05");
  });

  it("video dài hơn 1 tiếng thì phút KHÔNG cuộn về 0", () => {
    // 62 phút 05 → "62:05". Nếu cuộn vòng thành "02:05" thì admin đọc nhầm sang phút thứ 2.
    expect(formatMmSs(3_725_000)).toBe("62:05");
  });

  it("rỗng / âm / NaN trả về gạch ngang như các cột khác của admin", () => {
    expect(formatMmSs(null)).toBe("—");
    expect(formatMmSs(undefined)).toBe("—");
    expect(formatMmSs(-1)).toBe("—");
    expect(formatMmSs(Number.NaN)).toBe("—");
  });
});

describe("formatDurationSeconds", () => {
  it("BE trả durationSeconds → mm:ss", () => {
    expect(formatDurationSeconds(45)).toBe("00:45");
    expect(formatDurationSeconds(180)).toBe("03:00");
  });

  it("thiếu độ dài (clip chưa cắt xong) → gạch ngang", () => {
    expect(formatDurationSeconds(null)).toBe("—");
  });
});

describe("parseMmSs", () => {
  it("đọc được mm:ss", () => {
    expect(parseMmSs("00:00")).toBe(0);
    expect(parseMmSs("01:05")).toBe(65_000);
    expect(parseMmSs("62:05")).toBe(3_725_000);
  });

  it("bỏ khoảng trắng thừa hai đầu", () => {
    expect(parseMmSs("  01:05 ")).toBe(65_000);
  });

  it("đi vòng tròn: format rồi parse ra đúng số cũ (đã làm tròn xuống giây)", () => {
    for (const ms of [0, 1_000, 65_000, 179_000, 3_725_000]) {
      expect(parseMmSs(formatMmSs(ms))).toBe(ms);
    }
  });

  it("từ chối những gì không đọc chắc được thay vì đoán ý", () => {
    // "1:5" có thể là 1:05 mà cũng có thể là 1:50 gõ thiếu — đoán sai là cắt sai đoạn.
    expect(parseMmSs("1:5")).toBeNull();
    expect(parseMmSs("")).toBeNull();
    expect(parseMmSs("   ")).toBeNull();
    expect(parseMmSs("abc")).toBeNull();
    expect(parseMmSs("90")).toBeNull();
    expect(parseMmSs("01:60")).toBeNull();
    expect(parseMmSs("-01:00")).toBeNull();
    expect(parseMmSs("00:01:05")).toBeNull();
    expect(parseMmSs(null)).toBeNull();
  });
});

describe("checkClipRange — chặn khoảng vô lý NGAY Ở FE", () => {
  it("khoảng hợp lệ trả null", () => {
    expect(checkClipRange(60_000, 105_000)).toBeNull();
    expect(isValidClipRange(60_000, 105_000)).toBe(true);
  });

  it("mốc âm bị chặn trước mọi luật khác", () => {
    expect(checkClipRange(-1, 10_000)?.code).toBe("NEGATIVE");
    expect(checkClipRange(0, -5)?.code).toBe("NEGATIVE");
    expect(checkClipRange(Number.NaN, 10_000)?.code).toBe("NEGATIVE");
  });

  it("mốc ra bằng hoặc trước mốc vào bị chặn", () => {
    expect(checkClipRange(60_000, 60_000)?.code).toBe("END_BEFORE_START");
    expect(checkClipRange(60_000, 30_000)?.code).toBe("END_BEFORE_START");
  });

  it("khoảng dưới 1 giây bị chặn (thường là gõ nhầm)", () => {
    expect(checkClipRange(60_000, 60_500)?.code).toBe("TOO_SHORT");
  });

  it("đúng 180 giây vẫn qua, quá 180 giây thì chặn", () => {
    expect(checkClipRange(0, MAX_CLIP_MS)).toBeNull();
    expect(checkClipRange(0, MAX_CLIP_MS + 1_000)?.code).toBe("TOO_LONG");
  });

  it("mốc ra vượt thời lượng video bị chặn — nhưng CHỈ khi biết thời lượng", () => {
    expect(checkClipRange(60_000, 90_000, 80_000)?.code).toBe("BEYOND_DURATION");
    // Không biết thời lượng thì không được bịa trần rồi chặn oan.
    expect(checkClipRange(60_000, 90_000, null)).toBeNull();
    expect(checkClipRange(60_000, 90_000, 0)).toBeNull();
    expect(checkClipRange(60_000, 90_000)).toBeNull();
  });

  it("thứ tự ưu tiên: end ≤ start được báo trước 'quá dài'", () => {
    // Khoảng vừa ngược vừa (nếu tính trị tuyệt đối) dài quá — phải chỉ đúng lỗi người dùng gây ra.
    expect(checkClipRange(600_000, 100_000)?.code).toBe("END_BEFORE_START");
  });
});

describe("formatBytes", () => {
  it("đọc được ở cả ba bậc", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("thiếu số thì gạch ngang", () => {
    expect(formatBytes(null)).toBe("—");
  });
});
