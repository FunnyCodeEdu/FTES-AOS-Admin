import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComponent, waitFor } from "../../../../shared/testing/hookHarness";

/**
 * shortvideo-clip-draft — tab "Tạo clip" KHÔNG được mất việc đang làm khi rời tab / tải lại trang.
 *
 * <p>Bản cũ để `destroyOnHidden` trên `<Tabs>` với lý do "giữ đề xuất cũ dễ khiến cắt lặp một
 * đoạn". Nhưng thứ chặn cắt lặp là dấu `cutSignatures` trong panel, mà nó cũng bị xoá cùng lúc —
 * nên cờ đó vứt đi đúng bản ghi sinh ra để chống cắt lặp. Tệ hơn: chính trang hướng dẫn "cắt xong
 * chuyển sang Studio để tải/đăng", tức thao tác được khuyến khích nhất cũng là thao tác xoá sạch
 * việc đang làm — gồm cả job AI vừa tốn tiền chạy.
 */

if (typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const highlightJobMock = vi.hoisted(() => vi.fn((): { data: unknown } => ({ data: undefined })));
const jobArgs = vi.hoisted(() => [] as Array<[string | undefined, boolean]>);

vi.mock("../../../../shared/hooks/useIsMobile", () => ({ useIsMobile: () => false }));

vi.mock("../api/shortvideo.api", () => ({
  useCreateHighlights: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useHighlightJob: (id: string | undefined, enabled: boolean) => {
    jobArgs.push([id, enabled]);
    return highlightJobMock();
  },
  useCreateClip: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("../../../academic/courses/api/courses.api", () => ({
  useCourses: () => ({ data: { items: [], total: 0 }, isLoading: false }),
  useCourse: () => ({ data: undefined, isLoading: false }),
}));

vi.mock("../../../academic/lessons/api/lessons.api", () => ({
  useLessonStream: () => ({ data: null, isLoading: false }),
  useLessonPreview: () => ({ data: undefined }),
}));

const { CreateClipPanel } = await import("./CreateClipPanel");
const { loadClipDraft, saveClipDraft } = await import("../clipDraft");

describe("CreateClipPanel — nháp", () => {
  beforeEach(() => {
    localStorage.clear();
    jobArgs.length = 0;
    highlightJobMock.mockReturnValue({ data: undefined });
  });

  it("có nháp thì hỏi lại BE job đã chạy thay vì bắt xin đề xuất từ đầu", async () => {
    saveClipDraft({
      courseId: "c1",
      lessonId: "l1",
      count: 5,
      minSeconds: 20,
      maxSeconds: 60,
      jobId: "job-cu",
      cutSignatures: {},
    });

    renderComponent(<CreateClipPanel />);

    await waitFor(() => {
      // id lấy từ nháp, và enabled=true dù job chưa RUNNING — không nạp thì quay lại tab thấy trang
      // trắng dù job đã chạy xong.
      expect(jobArgs.some(([id, enabled]) => id === "job-cu" && enabled)).toBe(true);
    });
  });

  it("không có nháp thì không hỏi job nào", async () => {
    renderComponent(<CreateClipPanel />);
    await waitFor(() => {
      expect(jobArgs.length).toBeGreaterThan(0);
    });
    expect(jobArgs.every(([id]) => id === undefined)).toBe(true);
  });

  it("mount rỗng KHÔNG ghi đè nháp đang có bằng state trống", async () => {
    // Ca thật: mở lại tab rồi chưa kịp chọn gì. Ghi đè ở đây là mất trắng job cũ.
    saveClipDraft({
      courseId: "c1", lessonId: "l1", count: 5, minSeconds: 20, maxSeconds: 60,
      jobId: "job-cu", cutSignatures: { s1: "sig" },
    });
    renderComponent(<CreateClipPanel />);
    await waitFor(() => expect(jobArgs.length).toBeGreaterThan(0));

    const d = loadClipDraft();
    expect(d?.jobId).toBe("job-cu");
    expect(d?.cutSignatures).toEqual({ s1: "sig" });
  });
});
