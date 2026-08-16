import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../../shared/api/client";
import {
  FE_ALBUM_MAX_IMAGES,
  FE_IMAGE_MAX_BYTES,
  describePlanWarnings,
  estimateUploadSeconds,
  isFeRateLimitError,
  naturalCompare,
  planFeAlbumUpload,
  planFeTextUpload,
  batchFeUploadItems,
  FE_TEXT_MAX_BYTES,
  runFeAlbumUpload,
  type FeAlbumUploadItem,
} from "./feAlbumUpload";

// admin-fe-album-image-upload — FE = album ảnh: thứ tự nạp CHÍNH LÀ thứ tự trang album (BE đóng dấu
// sortOrder = max+1), trần 200 ảnh và rate limit 10 ảnh/phút là luật của BE, không phải gợi ý.

/** File giả: `size` và `type` là tất cả những gì kế hoạch cần; `webkitRelativePath` mô phỏng thư mục. */
function fakeFile(name: string, opts: { size?: number; type?: string; path?: string } = {}): File {
  const file = new File(["x"], name, { type: opts.type ?? "image/png" });
  Object.defineProperty(file, "size", { value: opts.size ?? 1024 });
  if (opts.path) {
    Object.defineProperty(file, "webkitRelativePath", { value: opts.path });
  }
  return file;
}

function pathsOf(items: FeAlbumUploadItem[]): string[] {
  return items.map((i) => i.path);
}

describe("naturalCompare", () => {
  it("de2 đứng trước de10 (thứ tự người đọc, không phải thứ tự chuỗi)", () => {
    const names = ["de10.png", "de1.png", "de2.png"].sort(naturalCompare);
    expect(names).toEqual(["de1.png", "de2.png", "de10.png"]);
  });
});

describe("planFeAlbumUpload", () => {
  it("sắp ảnh theo thứ tự tự nhiên của đường dẫn", () => {
    const plan = planFeAlbumUpload([
      fakeFile("de10.png", { path: "fe/de10.png" }),
      fakeFile("de2.png", { path: "fe/de2.png" }),
      fakeFile("de1.png", { path: "fe/de1.png" }),
    ]);
    expect(pathsOf(plan.items)).toEqual(["fe/de1.png", "fe/de2.png", "fe/de10.png"]);
    expect(plan.skipped).toHaveLength(0);
  });

  it("không truyền capacity → dùng trần mặc định 200 (đề FE 60–100+ câu phải vừa)", () => {
    expect(FE_ALBUM_MAX_IMAGES).toBe(200);
    const files = Array.from({ length: 120 }, (_, i) => fakeFile(`de${i + 1}.png`));
    const plan = planFeAlbumUpload(files);
    expect(plan.items).toHaveLength(120); // 120 > 50 cũ, vẫn dưới trần mới → KHÔNG bị cắt
    expect(plan.skipped.find((s) => s.reason === "over-cap")).toBeUndefined();
    expect(plan.capacity).toBe(FE_ALBUM_MAX_IMAGES);
  });

  it("giữ 50 ảnh đầu khi quá trần và BÁO số bị bỏ lại (không cắt im lặng)", () => {
    const files = Array.from({ length: 63 }, (_, i) => fakeFile(`de${i + 1}.png`));
    const plan = planFeAlbumUpload(files, 50);

    expect(plan.items).toHaveLength(50);
    expect(pathsOf(plan.items)[0]).toBe("de1.png");
    expect(pathsOf(plan.items)[49]).toBe("de50.png");
    const overCap = plan.skipped.find((s) => s.reason === "over-cap");
    expect(overCap?.count).toBe(13);
    expect(describePlanWarnings(plan)[0]).toContain("bỏ lại 13 ảnh");
  });

  it("chỗ trống tính theo album hiện có (sửa học liệu đã có 30 ảnh)", () => {
    const files = Array.from({ length: 25 }, (_, i) => fakeFile(`p${i + 1}.jpg`, { type: "image/jpeg" }));
    const plan = planFeAlbumUpload(files, 50 - 30);
    expect(plan.items).toHaveLength(20);
    expect(plan.skipped.find((s) => s.reason === "over-cap")?.count).toBe(5);
  });

  it("gom file bị loại theo lý do: không phải ảnh, quá 10MB, rỗng", () => {
    const plan = planFeAlbumUpload([
      fakeFile("de1.png"),
      fakeFile("huong-dan.pdf", { type: "application/pdf" }),
      fakeFile("thumuc.zip", { type: "application/zip" }),
      fakeFile("to.png", { size: FE_IMAGE_MAX_BYTES + 1 }),
      fakeFile("rong.png", { size: 0 }),
    ]);

    expect(pathsOf(plan.items)).toEqual(["de1.png"]);
    expect(plan.picked).toBe(5);
    expect(plan.skipped.find((s) => s.reason === "not-image")?.count).toBe(2);
    expect(plan.skipped.find((s) => s.reason === "too-large")?.count).toBe(1);
    expect(plan.skipped.find((s) => s.reason === "empty")?.count).toBe(1);
    const warnings = describePlanWarnings(plan).join(" ");
    expect(warnings).toContain("không phải ảnh");
    expect(warnings).toContain("vượt 10MB");
    expect(warnings).toContain("rỗng");
  });

  it("file.type rỗng thì suy MIME theo đuôi (Windows hay trả rỗng); đuôi lạ thì loại", () => {
    const plan = planFeAlbumUpload([
      fakeFile("a.JPG", { type: "" }),
      fakeFile("b.webp", { type: "" }),
      fakeFile("c.bmp", { type: "" }),
    ]);
    expect(plan.items.map((i) => i.mimeType)).toEqual(["image/jpeg", "image/webp"]);
    expect(plan.skipped.find((s) => s.reason === "not-image")?.count).toBe(1);
  });

  it("album đã đầy → không lên kế hoạch tải ảnh nào", () => {
    const plan = planFeAlbumUpload([fakeFile("de1.png")], 0);
    expect(plan.items).toHaveLength(0);
    expect(plan.skipped.find((s) => s.reason === "over-cap")?.count).toBe(1);
  });
});

describe("estimateUploadSeconds", () => {
  it("50 ảnh mất vài phút vì nhịp chống rate-limit (nói trước cho admin)", () => {
    expect(estimateUploadSeconds(0)).toBe(0);
    expect(estimateUploadSeconds(50)).toBeGreaterThan(300);
  });
});

describe("isFeRateLimitError", () => {
  it("nhận 429 qua HTTP code lẫn qua mã nằm trong message của envelope", () => {
    expect(isFeRateLimitError(new ApiError(429, "bất kỳ"))).toBe(true);
    expect(
      isFeRateLimitError(new ApiError(400, "RESOURCE_RATE_LIMITED: Vượt giới hạn tần suất"))
    ).toBe(true);
    expect(isFeRateLimitError(new ApiError(400, "RESOURCE_VALIDATION: sai"))).toBe(false);
    expect(isFeRateLimitError(new Error("mạng lỗi"))).toBe(false);
  });
});

describe("runFeAlbumUpload", () => {
  const items = (n: number): FeAlbumUploadItem[] =>
    Array.from({ length: n }, (_, i) => ({
      file: fakeFile(`de${i + 1}.png`),
      path: `de${i + 1}.png`,
      mimeType: "image/png",
    }));

  /** Đồng hồ giả: `sleep` cộng thẳng vào `now` nên test chạy tức thì mà nhịp vẫn kiểm được. */
  function fakeClock() {
    let current = 0;
    return {
      now: () => current,
      sleep: async (ms: number) => {
        current += ms;
      },
      advance: (ms: number) => {
        current += ms;
      },
    };
  }

  it("tải TUẦN TỰ và giãn ≥6,5s giữa hai request (dưới trần 10 ảnh/phút)", async () => {
    const clock = fakeClock();
    const startedAt: number[] = [];
    const result = await runFeAlbumUpload(items(5), {
      upload: async () => {
        startedAt.push(clock.now());
        clock.advance(800); // thời gian truyền
      },
      sleep: clock.sleep,
      now: clock.now,
    });

    expect(result).toMatchObject({ outcome: "done", uploaded: 5, total: 5 });
    for (let i = 1; i < startedAt.length; i += 1) {
      expect(startedAt[i] - startedAt[i - 1]).toBeGreaterThanOrEqual(6_500);
    }
  });

  it("429 → lùi rồi thử lại CHÍNH tấm đó, xong vẫn chạy tiếp phần còn lại", async () => {
    const clock = fakeClock();
    const attempts: string[] = [];
    let failures = 2;
    const states: string[] = [];

    const result = await runFeAlbumUpload(items(3), {
      upload: async (item) => {
        attempts.push(item.path);
        if (item.path === "de2.png" && failures > 0) {
          failures -= 1;
          throw new ApiError(429, "RESOURCE_RATE_LIMITED: Vượt giới hạn tần suất");
        }
      },
      sleep: clock.sleep,
      now: clock.now,
      onProgress: (p) => states.push(p.state),
    });

    expect(result).toMatchObject({ outcome: "done", uploaded: 3 });
    expect(attempts).toEqual(["de1.png", "de2.png", "de2.png", "de2.png", "de3.png"]);
    expect(states).toContain("retrying");
  });

  it("hết bậc backoff mà vẫn 429 → dừng và trả đúng số ảnh ĐÃ nạp", async () => {
    const clock = fakeClock();
    const result = await runFeAlbumUpload(items(4), {
      upload: async (item) => {
        if (item.path !== "de1.png") {
          throw new ApiError(429, "RESOURCE_RATE_LIMITED: Vượt giới hạn tần suất");
        }
      },
      sleep: clock.sleep,
      now: clock.now,
      backoffMs: [1_000, 2_000],
    });

    expect(result.outcome).toBe("failed");
    expect(result.uploaded).toBe(1);
    expect(result.total).toBe(4);
    expect(isFeRateLimitError(result.error)).toBe(true);
  });

  it("lỗi KHÁC 429 (vd 400) dừng ngay, không thử lại", async () => {
    const clock = fakeClock();
    const upload = vi.fn(async (item: FeAlbumUploadItem) => {
      if (item.path === "de2.png") throw new ApiError(400, "RESOURCE_VALIDATION: ảnh hỏng");
    });

    const result = await runFeAlbumUpload(items(3), { upload, sleep: clock.sleep, now: clock.now });

    expect(result).toMatchObject({ outcome: "failed", uploaded: 1 });
    expect(upload).toHaveBeenCalledTimes(2); // de1 xong, de2 hỏng, KHÔNG chạm de3
  });

  it("huỷ giữa chừng → outcome cancelled + số ảnh đã nạp thật (để nạp tiếp)", async () => {
    const clock = fakeClock();
    let cancelled = false;
    const result = await runFeAlbumUpload(items(6), {
      upload: async (_item, index) => {
        if (index === 1) cancelled = true; // admin bấm "Dừng" ngay sau ảnh thứ 2
      },
      sleep: clock.sleep,
      now: clock.now,
      isCancelled: () => cancelled,
    });

    expect(result).toMatchObject({ outcome: "cancelled", uploaded: 2, total: 6 });
  });

  it("danh sách rỗng → xong ngay, không gọi upload lần nào", async () => {
    const upload = vi.fn();
    const result = await runFeAlbumUpload([], { upload, sleep: async () => {} });
    expect(result).toMatchObject({ outcome: "done", uploaded: 0, total: 0 });
    expect(upload).not.toHaveBeenCalled();
  });
});

// admin-fe-album-three-modes — album FE nhận đề theo BA đường; hai đường số hoá gửi theo LÔ, nên
// hai thứ dễ sai nhất là thứ tự trang giữa các lô và con số báo cho người soạn.

describe("batchFeUploadItems", () => {
  const items = (n: number): FeAlbumUploadItem[] =>
    Array.from({ length: n }, (_, i) => ({
      file: fakeFile(`t${i + 1}.png`),
      path: `t${i + 1}.png`,
      mimeType: "image/png",
    }));

  it("giữ nguyên thứ tự trang khi chia lô — đảo lô là đảo trang của đề", () => {
    const batches = batchFeUploadItems(items(7), 3);
    expect(batches.map((b) => pathsOf(b.items))).toEqual([
      ["t1.png", "t2.png", "t3.png"],
      ["t4.png", "t5.png", "t6.png"],
      ["t7.png"],
    ]);
  });

  it("lô cuối lẻ vẫn được gửi, không bị bỏ", () => {
    expect(batchFeUploadItems(items(51), 3)).toHaveLength(17);
    expect(batchFeUploadItems(items(52), 3).at(-1)?.items).toHaveLength(1);
  });
});

describe("runFeAlbumUpload theo lô", () => {
  it("đếm theo TRANG chứ không theo bước — 51 trang chia lô 3 vẫn báo 51", async () => {
    const batches = batchFeUploadItems(
      Array.from({ length: 51 }, (_, i) => ({
        file: fakeFile(`t${i + 1}.png`),
        path: `t${i + 1}.png`,
        mimeType: "image/png",
      })),
      3
    );
    const result = await runFeAlbumUpload(batches, {
      upload: async () => {},
      weightOf: (b) => b.items.length,
      sleep: async () => {},
      minIntervalMs: 0,
    });
    expect(result).toMatchObject({ uploaded: 51, total: 51, outcome: "done" });
  });

  it("lô hỏng giữa chừng trả về số TRANG đã nạp thật, để nạp tiếp đúng chỗ", async () => {
    const batches = batchFeUploadItems(
      Array.from({ length: 9 }, (_, i) => ({
        file: fakeFile(`t${i + 1}.png`),
        path: `t${i + 1}.png`,
        mimeType: "image/png",
      })),
      3
    );
    const upload = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("BE từ chối lô 2"));
    const result = await runFeAlbumUpload(batches, {
      upload,
      weightOf: (b) => b.items.length,
      sleep: async () => {},
      minIntervalMs: 0,
    });
    expect(result.outcome).toBe("failed");
    expect(result.uploaded).toBe(3); // lô 1 đã vào, KHÔNG phải "1 bước"
  });
});

describe("planFeTextUpload", () => {
  it("chỉ nhận .txt/.md — file khác bị bỏ kèm lý do đọc được", () => {
    const plan = planFeTextUpload([
      fakeFile("de1.txt", { type: "text/plain" }),
      fakeFile("de2.md", { type: "text/markdown" }),
      fakeFile("de3.png", { type: "image/png" }),
    ]);
    expect(pathsOf(plan.items)).toEqual(["de1.txt", "de2.md"]);
    expect(describePlanWarnings(plan).join(" ")).toContain(".txt/.md");
  });

  it("lọc theo ĐUÔI chứ không theo file.type — trình duyệt trả type rỗng cho .md ở nhiều máy", () => {
    const plan = planFeTextUpload([fakeFile("de.md", { type: "" })]);
    expect(pathsOf(plan.items)).toEqual(["de.md"]);
  });

  it("file vượt trần bytes của BE bị chặn từ client, không đốt một lượt gọi AI", () => {
    const plan = planFeTextUpload([
      fakeFile("to.txt", { type: "text/plain", size: FE_TEXT_MAX_BYTES + 1 }),
    ]);
    expect(plan.items).toHaveLength(0);
    expect(plan.skipped[0]?.reason).toBe("too-large");
  });
});
