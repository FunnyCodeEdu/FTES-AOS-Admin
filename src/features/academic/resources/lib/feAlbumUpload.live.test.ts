import { beforeAll, describe, expect, it } from "vitest";

// Chạy trong jsdom (mặc định của repo) chứ không phải node: `useAuthStore` chạm `localStorage`
// ngay lúc nạp module, nên môi trường node làm bài này chết ở khâu import — trước cả khi `skipIf`
// kịp bỏ qua. Đổi lại, axios đi qua XHR của jsdom; CORS của BE đã allow `http://localhost:*`.

import { useAuthStore } from "../../../auth/store";
import {
  FE_IMAGE_TEXT_MAX_PER_REQUEST,
  uploadFeAlbumImage,
  uploadFeImageTextItems,
  uploadFeTextItems,
} from "../api/resources.api";
import { coreClient } from "../../../../shared/api/client";
import {
  batchFeUploadItems,
  planFeAlbumUpload,
  planFeTextUpload,
  runFeAlbumUpload,
} from "./feAlbumUpload";

/**
 * Luồng nạp đề FE chạy THẬT qua tầng API của Admin, đối chiếu backend live.
 *
 * <p><b>Vì sao cần, dù đã có test đơn vị.</b> Test đơn vị của `feAlbumUpload` tiêm hàm upload giả,
 * nên nó chứng minh được luật chia lô / nhịp / đếm trang — nhưng KHÔNG chạm tới thứ hay hỏng nhất:
 * tên field multipart, `Content-Type: undefined` để axios tự đặt boundary, envelope `{code,message,
 * data}` mà interceptor bóc, và các trần do BE chốt. Ba thứ đó chỉ lộ ra khi có backend thật ở đầu
 * kia. Chuỗi lỗi đã trả giá đúng ở tầng này: FormData bị `JSON.stringify` thành body rỗng, và trần
 * 3 file mỗi lượt mà client không biết.
 *
 * <p><b>Vì sao bỏ qua khi không có token.</b> Bài này gọi mạng và tốn lượt gọi model — không được
 * chạy trong CI. Cấp token là hành động CÓ CHỦ Ý của người chạy, nên `skipIf` lấy đúng biến đó làm
 * công tắc thay vì một cờ riêng dễ bật nhầm.
 *
 * Chạy:
 *   VITE_LIVE_TOKEN=<access token> VITE_LIVE_SUBJECT=<uuid môn> \
 *   VITE_API_BASE_URL=https://apitest.ftes.vn npx vitest run feAlbumUpload.live
 */
// Đọc qua `import.meta.env` chứ không qua `process.env`: repo này build cho trình duyệt và không
// khai `@types/node`, nên chạm `process` làm `tsc --noEmit` đỏ ở một file test. Vite chuyển tiếp
// biến môi trường có tiền tố VITE_ nên cách này chạy được cả trong vitest.
const TOKEN = import.meta.env.VITE_LIVE_TOKEN as string | undefined;
const SUBJECT_ID = import.meta.env.VITE_LIVE_SUBJECT as string | undefined;

function pngFile(name: string): File {
  // PNG 1x1 thật — BE nhận diện ảnh bằng magic byte, không bằng đuôi tên.
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new File([bytes], name, { type: "image/png" });
}

function textFile(name: string, body: string): File {
  return new File([body], name, { type: name.endsWith(".md") ? "text/markdown" : "text/plain" });
}

describe.skipIf(!TOKEN || !SUBJECT_ID)("luồng nạp đề FE của Admin — backend thật", () => {
  let resourceId: string;

  beforeAll(async () => {
    useAuthStore.setState({ accessToken: TOKEN as string });
    const created = await coreClient.post("/resources", {
      title: `Live test nạp đề ${Date.now()}`,
      description: "Bài kiểm tự động luồng nạp đề FE của Admin",
      type: "FE",
      subjectId: SUBJECT_ID,
    });
    resourceId = (created.data as { id: string }).id;
    expect(resourceId).toBeTruthy();
  }, 120_000);

  it(
    "chế độ ảnh giữ nguyên: đi qua uploadFeAlbumImage và trả về trang IMAGE",
    async () => {
      const plan = planFeAlbumUpload([pngFile("trang01.png")], 200);
      expect(plan.items).toHaveLength(1);

      const result = await runFeAlbumUpload(plan.items, {
        upload: async (item) => {
          const view = await uploadFeAlbumImage({
            resourceId,
            file: item.file,
            mimeType: item.mimeType,
          });
          expect(view.kind ?? "IMAGE").toBe("IMAGE");
          expect(view.imageUrl).toMatch(/^https?:\/\//);
        },
        sleep: async () => {},
        minIntervalMs: 0,
      });

      expect(result).toMatchObject({ uploaded: 1, outcome: "done" });
    },
    180_000
  );

  it(
    "chế độ ảnh→chữ: chia lô đúng trần BE và đếm theo TRANG",
    async () => {
      const files = [1, 2, 3, 4].map((n) => pngFile(`scan${n}.png`));
      const plan = planFeAlbumUpload(files, 200);
      const batches = batchFeUploadItems(plan.items, FE_IMAGE_TEXT_MAX_PER_REQUEST);

      // 4 trang → 2 lô (3 + 1). Gửi cả 4 trong một request là ăn 400 của BE.
      expect(batches.map((b) => b.items.length)).toEqual([3, 1]);

      const result = await runFeAlbumUpload(batches, {
        weightOf: (b) => b.items.length,
        upload: async (batch) => {
          const res = await uploadFeImageTextItems({
            resourceId,
            files: batch.items.map((i) => i.file),
          });
          expect(res.failed).toEqual([]);
          expect(res.created).toHaveLength(batch.items.length);
          // Hợp đồng MỚI: trang về ngay ở trạng thái PENDING, chưa có chữ. Kỳ vọng có `textContent`
          // ở đây là kỳ vọng đường cũ — đường bắt người soạn chờ model trong chính request.
          for (const page of res.created) {
            expect(page.kind).toBe("TEXT");
            expect(page.status).toBe("PENDING");
          }
        },
        sleep: async () => {},
        minIntervalMs: 0,
      });

      // Con số báo cho người soạn phải là 4 TRANG, không phải 2 lô.
      expect(result).toMatchObject({ uploaded: 4, total: 4, outcome: "done" });
    },
    600_000
  );

  it(
    "chế độ tệp văn bản: giữ nguyên số câu đề đã in",
    async () => {
      const plan = planFeTextUpload([
        textFile("de_phan2.md", "3) Cau hoi ba?\n- A. mot\n- B. hai\n- C. ba\n- D. bon\n"),
      ]);
      expect(plan.items).toHaveLength(1);

      const res = await uploadFeTextItems({
        resourceId,
        files: plan.items.map((i) => i.file),
      });

      expect(res.failed).toEqual([]);
      // Đánh lại số từ 1 sẽ khiến phần 2 lặp số của phần 1 — xem prompt normalize của ai-service.
      expect(res.created[0]?.textContent).toContain("**Câu 3.**");
    },
    300_000
  );

  it(
    "trần 3 file mỗi lượt là trần của BE, không phải quy ước của client",
    async () => {
      const tooMany = [1, 2, 3, 4].map((n) => pngFile(`gom${n}.png`));
      await expect(uploadFeImageTextItems({ resourceId, files: tooMany })).rejects.toThrow();
    },
    120_000
  );

  it(
    "album đọc lại được và trộn đúng hai loại trang",
    async () => {
      const res = await coreClient.get(`/resources/${resourceId}/images`);
      const album = res.data as {
        total: number;
        images: Array<{ kind?: string; imageUrl?: string; textContent?: string | null }>;
      };

      const byKind = album.images.reduce<Record<string, number>>((acc, page) => {
        const k = page.kind ?? "IMAGE";
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});
      expect(byKind.IMAGE).toBe(1);
      expect(byKind.TEXT).toBe(5);

      // Chỗ chiếu album rẽ nhánh theo `kind`; điều đó chỉ đúng nếu mỗi loại mang đúng dữ liệu của nó.
      for (const page of album.images) {
        if ((page.kind ?? "IMAGE") === "TEXT") {
          expect(page.textContent?.trim()).toBeTruthy();
        } else {
          expect(page.imageUrl).toMatch(/^https?:\/\//);
        }
      }
    },
    120_000
  );
});
