import type { AxiosAdapter, AxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it } from "vitest";

import { coreClient } from "../../../../shared/api/client";
import { postLessonDocument } from "./lessons.api";

// admin-lesson-document-upload-multipart — đính slide/PDF vào buổi học từ Admin luôn hỏng vì
// `coreClient` khai mặc định `Content-Type: application/json`, và axios gặp FormData kèm
// content-type JSON thì đổi FormData thành JSON. File thành `{}`, endpoint multipart trả 415.
//
// Test đi qua CHÍNH `coreClient` thật (không phải một axios trần) vì cái mặc định JSON đó mới là
// thứ gây lỗi — dựng một client sạch để test là test đúng cái không hỏng bao giờ.

const original = coreClient.defaults.adapter;

/** Bắt lấy request tại tầng gửi — sau interceptor và sau transformRequest. */
function captureAdapter(): { seen: AxiosRequestConfig[]; adapter: AxiosAdapter } {
  const seen: AxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (config) => {
    seen.push(config);
    return {
      data: { code: 200, message: "ok", data: { id: "doc-1", fileName: "slide.pptx" } },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
  return { seen, adapter };
}

afterEach(() => {
  coreClient.defaults.adapter = original;
});

describe("postLessonDocument", () => {
  it("gửi FormData nguyên vẹn tới tầng gửi, không bị hoá thành JSON", async () => {
    const { seen, adapter } = captureAdapter();
    coreClient.defaults.adapter = adapter;

    await postLessonDocument(
      "lesson-1",
      new File(["binary"], "slide.pptx", {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      }),
      "Slide buổi 1"
    );

    expect(seen).toHaveLength(1);
    const sent = seen[0];
    expect(sent.url).toContain("/courses/lessons/lesson-1/documents");
    // Điểm chốt: thân request còn là FormData. Nếu ai gỡ phần ghi đè header, chỗ này thành chuỗi.
    expect(sent.data).toBeInstanceOf(FormData);
    expect(typeof sent.data).not.toBe("string");
    expect((sent.data as FormData).get("file")).toBeInstanceOf(File);
    expect((sent.data as FormData).get("title")).toBe("Slide buổi 1");
    const contentType = String(sent.headers?.["Content-Type"] ?? "");
    expect(contentType).not.toContain("application/json");
  });

  it("bỏ title thì không gửi trường title rỗng", async () => {
    const { seen, adapter } = captureAdapter();
    coreClient.defaults.adapter = adapter;

    await postLessonDocument("lesson-2", new File(["x"], "de.pdf", { type: "application/pdf" }));

    expect((seen[0].data as FormData).has("title")).toBe(false);
  });

  it("CHỨNG MINH cái bẫy: qua cùng client mà không ghi đè header thì FormData thành chuỗi JSON", async () => {
    const { seen, adapter } = captureAdapter();
    coreClient.defaults.adapter = adapter;

    const form = new FormData();
    form.append("file", new File(["binary"], "slide.pptx"));
    await coreClient.post("/courses/lessons/lesson-3/documents", form);

    // Đây chính là thứ server nhận được trước khi sửa: một thân JSON, file đã bốc hơi.
    expect(typeof seen[0].data).toBe("string");
    expect(seen[0].data).not.toBeInstanceOf(FormData);
  });
});
