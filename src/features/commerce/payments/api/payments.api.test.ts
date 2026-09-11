import { describe, expect, it } from "vitest";
import { mapMatchStatus } from "./payments.api";

describe("payment status mapping", () => {
  it("does not label the QR intent as an unmatched bank transaction", () => {
    expect(mapMatchStatus("INITIATED")).toBe("pending");
    expect(mapMatchStatus("SUCCEEDED")).toBe("matched");
    expect(mapMatchStatus("FAILED")).toBe("unmatched");
  });
});
