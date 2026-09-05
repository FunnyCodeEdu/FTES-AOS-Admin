import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearClipDraft,
  EMPTY_DRAFT,
  hasRestorableWork,
  loadClipDraft,
  saveClipDraft,
} from "./clipDraft";

const KEY = "ftes:admin:shortvideo:clip-draft";

describe("clipDraft", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it("ghi rồi đọc lại ra đúng thứ đã ghi", () => {
    saveClipDraft({
      courseId: "c1",
      lessonId: "l1",
      count: 3,
      minSeconds: 15,
      maxSeconds: 45,
      jobId: "job-1",
      cutSignatures: { s1: "0-1000|Tiêu đề" },
    });
    const d = loadClipDraft();
    expect(d).toMatchObject({
      courseId: "c1",
      lessonId: "l1",
      count: 3,
      minSeconds: 15,
      maxSeconds: 45,
      jobId: "job-1",
      cutSignatures: { s1: "0-1000|Tiêu đề" },
    });
  });

  it("không có nháp thì trả null", () => {
    expect(loadClipDraft()).toBeNull();
  });

  it("JSON hỏng không làm vỡ, chỉ coi như không có nháp", () => {
    localStorage.setItem(KEY, "{khong-phai-json");
    expect(loadClipDraft()).toBeNull();
  });

  it("nháp quá 7 ngày bị bỏ", () => {
    const cu = Date.now() - 8 * 24 * 60 * 60 * 1000;
    localStorage.setItem(KEY, JSON.stringify({ ...EMPTY_DRAFT, savedAt: cu }));
    expect(loadClipDraft()).toBeNull();
  });

  it("field hỏng rơi về mặc định thay vì nhét undefined vào form", () => {
    // Nháp cũ còn sót sau một lần đổi kiểu dữ liệu: lỗi chỉ hiện ở đúng máy có nháp cũ.
    localStorage.setItem(
      KEY,
      JSON.stringify({
        count: "ba",
        minSeconds: null,
        maxSeconds: -5,
        courseId: "   ",
        cutSignatures: ["khong-phai-object"],
        savedAt: Date.now(),
      }),
    );
    const d = loadClipDraft();
    expect(d).toMatchObject({
      count: EMPTY_DRAFT.count,
      minSeconds: EMPTY_DRAFT.minSeconds,
      maxSeconds: EMPTY_DRAFT.maxSeconds,
      cutSignatures: {},
    });
    expect(d?.courseId).toBeUndefined();
  });

  it("lọc bỏ chữ ký không phải chuỗi", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        ...EMPTY_DRAFT,
        cutSignatures: { ok: "sig", hong: 123 },
        savedAt: Date.now(),
      }),
    );
    expect(loadClipDraft()?.cutSignatures).toEqual({ ok: "sig" });
  });

  it("xoá được nháp", () => {
    saveClipDraft({ ...EMPTY_DRAFT, jobId: "j" });
    clearClipDraft();
    expect(loadClipDraft()).toBeNull();
  });

  it("localStorage ném lỗi thì không làm vỡ trang", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });
    expect(() => saveClipDraft({ ...EMPTY_DRAFT })).not.toThrow();
    spy.mockRestore();
  });

  it("chỉ tham số mặc định thì chưa đáng khôi phục", () => {
    expect(hasRestorableWork(null)).toBe(false);
    expect(hasRestorableWork({ ...EMPTY_DRAFT, savedAt: Date.now() })).toBe(false);
    expect(hasRestorableWork({ ...EMPTY_DRAFT, jobId: "j", savedAt: Date.now() })).toBe(true);
    expect(hasRestorableWork({ ...EMPTY_DRAFT, lessonId: "l", savedAt: Date.now() })).toBe(true);
  });
});
