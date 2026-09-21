import { describe, expect, it } from "vitest";
import {
  fromBackendUserStatus,
  getUserStatusMeta,
  toBackendUserStatus,
  USER_STATUS_OPTIONS,
} from "./userStatus";

describe("user status contract", () => {
  it.each([
    ["active", "ACTIVE"],
    ["locked", "LOCKED"],
    ["pending", "PENDING_VERIFICATION"],
    ["disabled", "DISABLED"],
  ])("maps UI status %s to backend status %s", (uiStatus, backendStatus) => {
    expect(toBackendUserStatus(uiStatus)).toBe(backendStatus);
  });

  it("normalizes whitespace and casing before sending the filter", () => {
    expect(toBackendUserStatus(" Active ")).toBe("ACTIVE");
    expect(toBackendUserStatus("custom_status")).toBe("CUSTOM_STATUS");
    expect(toBackendUserStatus("   ")).toBeUndefined();
  });

  it.each([
    ["ACTIVE", "active"],
    ["LOCKED", "locked"],
    ["PENDING_VERIFICATION", "pending"],
    ["PENDING", "pending"],
    ["DISABLED", "disabled"],
  ])("maps backend status %s to UI status %s", (backendStatus, uiStatus) => {
    expect(fromBackendUserStatus(backendStatus)).toBe(uiStatus);
  });

  it("keeps an unknown backend status visible with default styling", () => {
    expect(fromBackendUserStatus("SUSPENDED")).toBe("suspended");
    expect(getUserStatusMeta("SUSPENDED")).toEqual({ color: "default", label: "SUSPENDED" });
  });

  it("offers every backend account status in the filter", () => {
    expect(USER_STATUS_OPTIONS.map((option) => option.value)).toEqual([
      "active",
      "locked",
      "pending",
      "disabled",
    ]);
  });
});
