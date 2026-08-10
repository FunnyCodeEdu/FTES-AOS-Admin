import { describe, expect, it } from "vitest";
import { toEventWizardValues } from "./EventWizardModal";
import type { OfficialEvent } from "../shared/types";

// Prefill là ĐÚNG chỗ HYBRID từng bị đánh rơi: nó nhận event từ BE rồi dựng giá trị form, đồng thời
// là mốc so sánh của diff PATCH. Ép hybrid → "online" ở đây gây hai hậu quả cùng lúc: form nói dối
// (tab Tổng quan in "hybrid", form hiện "Online"), và chỉ cần người dùng chạm vào ô Hình thức là
// body mang ONLINE/ONSITE, hạ HYBRID trong DB mà không cảnh báo gì.
//
// Test gọi thẳng hàm prefill — KHÔNG dựng sẵn mode="hybrid" ở cả hai đầu như test diff, vì làm vậy
// thì bản vá bị gỡ ra vẫn xanh (đã kiểm bằng mutation check).

const base: OfficialEvent = {
  id: "e1",
  type: "webinar",
  title: "Sự kiện",
  schedule: { startAt: "2026-09-01T10:00:00Z", endAt: "2026-09-01T12:00:00Z" },
  mode: "online",
  status: "published",
  createdAt: "2026-08-01T00:00:00Z",
};

describe("toEventWizardValues — hình thức phải đi nguyên vẹn vào form", () => {
  it("HYBRID giữ nguyên là 'hybrid', KHÔNG bị ép về 'online'", () => {
    const values = toEventWizardValues({ ...base, mode: "hybrid", onlineLink: "https://meet/x" });
    expect(values.mode).toBe("hybrid");
  });

  it("online và offline vẫn đi qua nguyên vẹn", () => {
    expect(toEventWizardValues({ ...base, mode: "online" }).mode).toBe("online");
    expect(toEventWizardValues({ ...base, mode: "offline", location: "Hội trường A" }).mode).toBe(
      "offline"
    );
  });

  it("giữ nguyên link/địa điểm để ô dùng chung của hybrid có giá trị", () => {
    const values = toEventWizardValues({ ...base, mode: "hybrid", onlineLink: "https://meet/x" });
    expect(values.onlineLink).toBe("https://meet/x");
  });
});
