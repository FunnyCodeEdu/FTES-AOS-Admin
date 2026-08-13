import { describe, expect, it } from "vitest";
import { buildGoldenBoardPayload, normalizeLines, willHaveLinkedUser } from "./payload";
import type { GoldenBoardEntry } from "./types";

// PUT của BE là BÁN PHẦN và `userId: null` mang nghĩa "GIỮ NGUYÊN link", không phải "gỡ link".
// Cả hai nghĩa cùng đi qua một hàm dựng body, nên chỗ này là nơi duy nhất có thể âm thầm tháo tài
// khoản của một người khỏi bảng vàng — đóng đinh bằng test.

function entryStub(over: Partial<GoldenBoardEntry> = {}): GoldenBoardEntry {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    termId: "SP26",
    rank: 1,
    userId: null,
    linkedUsername: null,
    linkedDisplayName: null,
    linkedAvatarUrl: null,
    displayName: null,
    photoUrl: null,
    headline: null,
    badgeLabel: null,
    lines: [],
    active: true,
    createdAt: null,
    updatedAt: null,
    ...over,
  };
}

const LINKED = entryStub({
  userId: "22222222-2222-2222-2222-222222222222",
  linkedUsername: "anhtu",
  linkedDisplayName: "Anh Tú",
  linkedAvatarUrl: "https://cdn/avatar.png",
});

describe("buildGoldenBoardPayload — liên kết tài khoản", () => {
  it("xoá trắng ô ID khi sửa KHÔNG gỡ link (không gửi userId ⇒ BE giữ nguyên)", () => {
    const body = buildGoldenBoardPayload({ userId: "  ", displayName: "Anh Tú" }, LINKED);
    expect(body.userId).toBeUndefined();
    expect(body.unlinkUser).toBeUndefined();
  });

  it("chỉ cờ unlinkUser mới gỡ link, và khi đó KHÔNG gửi kèm userId", () => {
    const body = buildGoldenBoardPayload(
      { userId: LINKED.userId ?? "", unlinkUser: true, displayName: "Anh Tú" },
      LINKED
    );
    expect(body.unlinkUser).toBe(true);
    expect(body.userId).toBeUndefined();
  });

  it("đổi sang tài khoản khác thì gửi userId mới", () => {
    const body = buildGoldenBoardPayload(
      { userId: "33333333-3333-3333-3333-333333333333" },
      LINKED
    );
    expect(body.userId).toBe("33333333-3333-3333-3333-333333333333");
    expect(body.unlinkUser).toBeUndefined();
  });

  it("lúc TẠO mới thì không bao giờ gửi unlinkUser (chưa có gì để gỡ)", () => {
    const body = buildGoldenBoardPayload({ unlinkUser: true, displayName: "Khách mời" }, null);
    expect(body.unlinkUser).toBeUndefined();
  });
});

describe("buildGoldenBoardPayload — field text và dòng thành tích", () => {
  it("ô bị xoá trắng gửi chuỗi rỗng để BE XOÁ field (không bỏ qua ô rỗng)", () => {
    const body = buildGoldenBoardPayload(
      { headline: "", badgeLabel: "  ", photoUrl: "" },
      entryStub({ headline: "TOP 100", badgeLabel: "GPA 9.6", photoUrl: "https://cdn/a.png" })
    );
    expect(body.headline).toBe("");
    expect(body.badgeLabel).toBe("");
    expect(body.photoUrl).toBe("");
  });

  it("mảng dòng luôn được gửi (mảng rỗng = xoá hết thành tích)", () => {
    const body = buildGoldenBoardPayload({ lines: [] }, entryStub({ lines: ["a", "b"] }));
    expect(body.lines).toEqual([]);
  });

  it("mặc định rank 0 / active true khi form chưa có giá trị", () => {
    const body = buildGoldenBoardPayload({ displayName: "Khách mời" }, null);
    expect(body.rank).toBe(0);
    expect(body.active).toBe(true);
  });
});

describe("normalizeLines", () => {
  it("bỏ dòng trống, cắt khoảng trắng và chặn trần 3 dòng", () => {
    expect(normalizeLines([" a ", "", undefined, "b", "c", "d"])).toEqual(["a", "b", "c"]);
  });
});

describe("willHaveLinkedUser — luật ck_golden_board_identity", () => {
  it("dòng đang link, ô ID để trống ⇒ vẫn còn link (nên displayName không bắt buộc)", () => {
    expect(willHaveLinkedUser({ userId: "" }, LINKED)).toBe(true);
  });

  it("bật gỡ link ⇒ hết link (displayName trở thành bắt buộc)", () => {
    expect(willHaveLinkedUser({ userId: LINKED.userId ?? "", unlinkUser: true }, LINKED)).toBe(
      false
    );
  });

  it("tạo mới không nhập ID ⇒ không có link", () => {
    expect(willHaveLinkedUser({}, null)).toBe(false);
  });
});
