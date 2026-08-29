import { describe, expect, it } from "vitest";
import {
  deepLinkProblem,
  segmentForMode,
  segmentModeOf,
  segmentProblem,
} from "./broadcastRules";
import { useBroadcastDraftStore } from "../store/broadcastDraftStore";

// Broadcast gửi cho vài nghìn người và KHÔNG thu hồi được. Hai nhóm ca dưới đây khoá lại đúng những
// chỗ mà một thay đổi vô hại trên giao diện có thể lặng lẽ biến thành sự cố thật.

describe("deepLinkProblem", () => {
  it("bỏ trống là hợp lệ — thông báo không kèm link vẫn gửi được", () => {
    expect(deepLinkProblem(undefined)).toBeNull();
    expect(deepLinkProblem("")).toBeNull();
    expect(deepLinkProblem("   ")).toBeNull();
  });

  it("nhận đường dẫn nội bộ", () => {
    expect(deepLinkProblem("/courses/abc")).toBeNull();
    expect(deepLinkProblem("  /notifications  ")).toBeNull();
  });

  // Broadcast mang tên hệ thống và gửi cho tất cả — người dùng bấm vì tin nó. Cho dán URL ngoài
  // vào đây là biến kênh đáng tin nhất trong sản phẩm thành công cụ phát tán link.
  it("từ chối URL tuyệt đối", () => {
    expect(deepLinkProblem("https://evil.example/x")).toContain("đường dẫn nội bộ");
    expect(deepLinkProblem("http://evil.example")).toContain("đường dẫn nội bộ");
  });

  // Nhìn như đường dẫn nội bộ (bắt đầu bằng '/') nhưng trình duyệt vẫn đi ra ngoài.
  it("từ chối protocol-relative //host", () => {
    expect(deepLinkProblem("//evil.example/x")).toContain("đường dẫn nội bộ");
  });

  it("từ chối link dài quá cột deep_link varchar(512)", () => {
    expect(deepLinkProblem(`/${"a".repeat(512)}`)).toContain("512");
  });
});

describe("segmentProblem", () => {
  // Ô vai trò trống cũng là trạng thái mặc định lúc vừa mở trang, nên "chưa chọn" và "cố ý gửi cho
  // toàn hệ thống" không được phép trông giống nhau.
  it("danh sách vai trò rỗng là LỖI, không phải 'gửi cho tất cả'", () => {
    expect(segmentProblem({ allUsers: false, roles: [] })).toContain("ít nhất một vai trò");
    expect(segmentProblem({})).toContain("ít nhất một vai trò");
  });

  it("chọn vai trò thì hợp lệ", () => {
    expect(segmentProblem({ allUsers: false, roles: ["STUDENT"] })).toBeNull();
  });

  it("bật allUsers thì hợp lệ dù không có vai trò nào", () => {
    expect(segmentProblem({ allUsers: true })).toBeNull();
  });
});

describe("segmentForMode / segmentModeOf", () => {
  it("đọc đúng chế độ đang chọn", () => {
    expect(segmentModeOf({ allUsers: true })).toBe("all");
    expect(segmentModeOf({ allUsers: false, roles: ["STUDENT"] })).toBe("roles");
    expect(segmentModeOf({})).toBe("roles");
  });

  // Sót roles cũ khi đã bật allUsers thì backend trả 400 BROADCAST_SEGMENT_AMBIGUOUS.
  it("đổi sang 'tất cả' thì KHÔNG để sót vai trò của chế độ cũ", () => {
    expect(segmentForMode("all")).toEqual({ allUsers: true });
    expect(segmentForMode("all").roles).toBeUndefined();
  });

  it("đổi về 'theo vai trò' thì tắt hẳn allUsers", () => {
    expect(segmentForMode("roles")).toEqual({ allUsers: false, roles: [] });
  });
});

describe("draft mặc định", () => {
  // Mở trang lên mà đã sẵn sàng bắn cho toàn hệ thống thì chỉ cần một cú bấm nhầm là hỏng.
  it("mặc định là 'theo vai trò' rỗng, KHÔNG phải 'tất cả người dùng'", () => {
    useBroadcastDraftStore.getState().resetDraft();
    const { draft } = useBroadcastDraftStore.getState();

    expect(draft.segment.allUsers).toBe(false);
    expect(segmentProblem(draft.segment)).not.toBeNull();
  });
});
