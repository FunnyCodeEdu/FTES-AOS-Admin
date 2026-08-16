import { describe, expect, it } from "vitest";
import { splitIntoBatches } from "./questionBank.api";

/**
 * Chia lô là thứ đứng giữa người soạn và một lỗi câm.
 *
 * Sự cố thật đã xảy ra: 41 ảnh máy ảnh gửi trong MỘT request ≈ 123MB → Cloudflare chặn ở 100MB và
 * trả HTML 413 THÔ (không phải envelope JSON), nên FE không đọc được lý do và chỉ hiện
 * "41 ảnh upload thất bại". Test ở đây ghim đúng những chỗ mà phép chia dễ sai — mỗi chỗ sai đều
 * đưa lỗi đó quay lại.
 */

/** File giả chỉ cần đúng `size` và `name`; phép chia không đọc nội dung. */
function file(name: string, mb: number): File {
  return { name, size: Math.round(mb * 1024 * 1024) } as File;
}

const MB = 1024 * 1024;

describe("splitIntoBatches", () => {
  it("gộp nhiều ảnh nhỏ vào MỘT lô — không chia vụn vô cớ", () => {
    const files = Array.from({ length: 20 }, (_, i) => file(`s${i}.png`, 1));
    const batches = splitIntoBatches(files, 60 * MB, 50);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(20);
  });

  it("chia đúng hình dạng sự cố thật: 41 ảnh × 3MB", () => {
    const files = Array.from({ length: 41 }, (_, i) => file(`p${i}.jpg`, 3));
    const batches = splitIntoBatches(files, 60 * MB, 50);

    // 123MB tổng → phải thành nhiều lô, và KHÔNG lô nào chạm trần.
    expect(batches.length).toBeGreaterThan(1);
    for (const b of batches) {
      const bytes = b.reduce((s, f) => s + f.size, 0);
      expect(bytes).toBeLessThanOrEqual(60 * MB);
    }
    // Không mất ảnh nào, và không nhân đôi ảnh nào.
    expect(batches.flat()).toHaveLength(41);
    expect(new Set(batches.flat().map((f) => f.name)).size).toBe(41);
  });

  it("giữ NGUYÊN thứ tự — người soạn đánh số ảnh theo thứ tự câu hỏi", () => {
    const files = Array.from({ length: 30 }, (_, i) => file(`q${i}.png`, 5));
    const names = splitIntoBatches(files, 60 * MB, 50).flat().map((f) => f.name);
    expect(names).toEqual(files.map((f) => f.name));
  });

  it("tôn trọng CẢ trần số lượng, không chỉ trần dung lượng", () => {
    // 60 ảnh tí hon: tổng bytes không đâu vào đâu, nhưng trần 50 file/request vẫn phải chặn.
    const files = Array.from({ length: 60 }, (_, i) => file(`t${i}.png`, 0.01));
    const batches = splitIntoBatches(files, 60 * MB, 50);
    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(50);
    expect(batches[1]).toHaveLength(10);
  });

  it("một file ĐƠN LẺ vượt trần vẫn được gửi riêng, không bị nuốt", () => {
    // Nuốt im lặng là tệ nhất: người soạn tưởng ảnh đã lên. Gửi riêng để backend trả lỗi nghiệp vụ
    // nói rõ file nào quá lớn.
    const files = [file("nho.png", 1), file("khong-lo.png", 200), file("nho2.png", 1)];
    const batches = splitIntoBatches(files, 60 * MB, 50);
    expect(batches.flat().map((f) => f.name)).toEqual([
      "nho.png",
      "khong-lo.png",
      "nho2.png",
    ]);
    expect(batches.some((b) => b.length === 1 && b[0].name === "khong-lo.png")).toBe(true);
  });

  it("danh sách rỗng trả về mảng rỗng, không phải một lô rỗng", () => {
    // Trả [[]] sẽ khiến vòng lặp gửi một request multipart KHÔNG có file nào và nhận
    // QUESTIONBANK_NO_FILES — một lỗi hoàn toàn do FE tự tạo ra.
    expect(splitIntoBatches([], 60 * MB, 50)).toEqual([]);
  });
});
