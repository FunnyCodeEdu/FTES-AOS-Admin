import { describe, expect, it } from "vitest";
import {
  activationSummary,
  canActivate,
  canEdit,
  eventStatus,
} from "./XpMultiplierEventsPage";
import { isMultiplierOverMax } from "../components/XpMultiplierEventFormModal";

// change quest-xp-multiplier — phần logic thuần của console sự kiện nhân hệ số XP.
// Tất cả đều xoay quanh một sự thật: sổ XP chỉ ghi thêm, XP đã cấp KHÔNG rút lại được.

const NOW = new Date("2026-08-20T10:00:00Z");
const ev = (over: Partial<Parameters<typeof eventStatus>[0]> = {}) => ({
  active: true,
  startsAt: "2026-08-19T00:00:00Z",
  endsAt: "2026-08-26T00:00:00Z",
  ...over,
});

describe("eventStatus — cờ bật/tắt KHÔNG đủ để nói sự kiện có đang nhân XP hay không", () => {
  it("chưa bật → Tắt, dù khung thời gian đang trong hạn", () => {
    expect(eventStatus(ev({ active: false }), NOW)).toBe("OFF");
  });

  it("đã bật + đang trong khung → ĐANG NHÂN XP", () => {
    expect(eventStatus(ev(), NOW)).toBe("RUNNING");
  });

  it("đã bật nhưng CHƯA tới giờ → chờ, chưa nhân XP của ai", () => {
    expect(
      eventStatus(ev({ startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-09-08T00:00:00Z" }), NOW)
    ).toBe("SCHEDULED");
  });

  it("đã bật nhưng khung ĐÃ qua → hết khung (không còn nhân), không được hiện như đang chạy", () => {
    expect(
      eventStatus(ev({ startsAt: "2026-08-01T00:00:00Z", endsAt: "2026-08-08T00:00:00Z" }), NOW)
    ).toBe("EXPIRED");
  });

  it("đúng mốc kết thúc đã là hết khung (khoảng nửa mở, khớp BE)", () => {
    expect(eventStatus(ev({ endsAt: NOW.toISOString() }), NOW)).toBe("EXPIRED");
  });
});

describe("canActivate — nút Bật không mời bấm vào chỗ chắc chắn lỗi", () => {
  it("bản nháp còn hạn → bật được", () => {
    expect(canActivate(ev({ active: false }), NOW)).toBe(true);
  });

  it("đang bật rồi → không hiện Bật nữa", () => {
    expect(canActivate(ev({ active: true }), NOW)).toBe(false);
  });

  it("bản nháp đã hết khung → KHÔNG bật được (BE cũng từ chối)", () => {
    expect(canActivate(ev({ active: false, endsAt: "2026-08-01T00:00:00Z" }), NOW)).toBe(false);
  });
});

describe("canEdit — sự kiện đang bật thì khoá sửa", () => {
  it("đổi hệ số/khung giữa chừng làm nửa ngày ghi theo luật khác ⇒ chặn", () => {
    expect(canEdit({ active: true })).toBe(false);
    expect(canEdit({ active: false })).toBe(true);
  });
});

describe("isMultiplierOverMax — trần đến từ BE, không phải hằng số của FE", () => {
  it("bằng trần thì được, vượt trần thì không", () => {
    expect(isMultiplierOverMax(5, 5)).toBe(false);
    expect(isMultiplierOverMax(5.01, 5)).toBe(true);
    expect(isMultiplierOverMax(100, 5)).toBe(true);
  });

  it("số lẻ dưới trần vẫn hợp lệ (x1.5 phải dùng được)", () => {
    expect(isMultiplierOverMax(1.5, 5)).toBe(false);
  });

  it("trần đổi theo cấu hình BE: cùng x10, trần x5 chặn, trần x10 cho qua", () => {
    expect(isMultiplierOverMax(10, 5)).toBe(true);
    expect(isMultiplierOverMax(10, 10)).toBe(false);
  });

  it("chưa nhập / không phải số → chưa coi là vượt (rule required lo phần bắt buộc)", () => {
    expect(isMultiplierOverMax(null, 5)).toBe(false);
    expect(isMultiplierOverMax(undefined, 5)).toBe(false);
    expect(isMultiplierOverMax(Number.NaN, 5)).toBe(false);
  });
});

describe("activationSummary — hộp xác nhận PHẢI nêu rõ hệ số + khung thời gian", () => {
  it("nêu đủ hệ số và cả hai mốc thời gian", () => {
    const text = activationSummary(
      { multiplier: 2.5, startsAt: "2026-08-19T00:00:00Z", endsAt: "2026-08-26T00:00:00Z" },
      (iso) => iso
    );
    expect(text).toContain("x2.5");
    expect(text).toContain("2026-08-19T00:00:00Z");
    expect(text).toContain("2026-08-26T00:00:00Z");
  });

  it("hệ số lẻ hiện đúng con số sắp có hiệu lực, không làm tròn", () => {
    expect(activationSummary({ multiplier: 1.5, startsAt: "a", endsAt: "b" }, (s) => s)).toContain(
      "x1.5"
    );
  });
});
