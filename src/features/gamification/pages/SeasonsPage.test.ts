import { describe, expect, it } from "vitest";
import { canCloseSeason } from "./SeasonsPage";

// Nợ quality-loop admin-gamification-console 4.3 (phần unit): action "Đóng season" ẩn khi
// CLOSED; endpoint close được test ở gamification.api.test (useCloseSeason).

describe("canCloseSeason", () => {
  it("CLOSED là trạng thái chót → ẩn action đóng", () => {
    expect(canCloseSeason("CLOSED")).toBe(false);
  });

  it("DRAFT / RUNNING / PENDING_CLOSE vẫn hiện action đóng", () => {
    expect(canCloseSeason("DRAFT")).toBe(true);
    expect(canCloseSeason("RUNNING")).toBe(true);
    expect(canCloseSeason("PENDING_CLOSE")).toBe(true);
  });
});
