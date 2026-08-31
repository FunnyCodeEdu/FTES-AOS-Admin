import { describe, expect, it, vi, afterEach } from "vitest";
import { STORY_VISIBLE_HOURS, storyVisibility } from "./format";

/**
 * Studio phải nói đúng thứ NGƯỜI HỌC đang thấy, không phải thứ đã từng được đăng.
 *
 * Cộng đồng chỉ trả tin đăng trong 24 giờ gần nhất (`StoryService.VISIBLE_WINDOW`), nên một clip
 * vẫn còn `publishedStoryId` có thể đã biến mất khỏi mục Tin từ lâu. Không phân biệt được hai
 * trạng thái đó thì admin nhìn thấy "Đang trên mục Tin" và đi báo lỗi một hệ thống đang chạy đúng.
 */
const gioTruoc = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

afterEach(() => {
    vi.useRealTimers();
});

describe("trạng thái hiển thị của tin", () => {
    it("chưa đăng thì không có gì để nói", () => {
        expect(storyVisibility({ publishedStoryId: null, publishedAt: null })).toBe("NONE");
        expect(storyVisibility({})).toBe("NONE");
    });

    it("vừa đăng thì đang hiện", () => {
        expect(storyVisibility({ publishedStoryId: "s1", publishedAt: gioTruoc(1) })).toBe("LIVE");
        expect(storyVisibility({ publishedStoryId: "s1", publishedAt: gioTruoc(23.5) })).toBe("LIVE");
    });

    it("quá 24 giờ thì cộng đồng đã ngừng trả — Studio phải nói là hết hạn", () => {
        expect(storyVisibility({ publishedStoryId: "s1", publishedAt: gioTruoc(25) })).toBe("EXPIRED");
        expect(storyVisibility({ publishedStoryId: "s1", publishedAt: gioTruoc(24 * 30) })).toBe("EXPIRED");
    });

    it("thiếu mốc đăng thì coi như còn hiện, không dán nhãn hết hạn cho một tin đang chạy", () => {
        expect(storyVisibility({ publishedStoryId: "s1", publishedAt: null })).toBe("LIVE");
        expect(storyVisibility({ publishedStoryId: "s1", publishedAt: "khong-phai-ngay" })).toBe("LIVE");
    });

    it("ngưỡng khớp đúng con số cộng đồng đang dùng", () => {
        expect(STORY_VISIBLE_HOURS).toBe(24);
        const dungBien = new Date(Date.now() - STORY_VISIBLE_HOURS * 3_600_000).toISOString();
        expect(storyVisibility({ publishedStoryId: "s1", publishedAt: dungBien })).toBe("EXPIRED");
    });
});
