import { describe, expect, it } from "vitest";
import { isMarketReportToken } from "./report-session";
const token = (claims: object) => `e30.${btoa(JSON.stringify(claims))}.test-signature`;
describe("report session UI routing hint", () => {
  it("accepts only the isolated issuer/audience pair", () => {
    expect(isMarketReportToken(token({ iss: "ftes-market-reviewer", aud: "market-insights" }))).toBe(true);
    expect(isMarketReportToken(token({ iss: "ftes-market-reviewer", aud: ["market-insights"] }))).toBe(true);
    expect(isMarketReportToken(token({ iss: "ordinary", aud: "market-insights" }))).toBe(false);
    expect(isMarketReportToken(token({ iss: "ftes-market-reviewer", aud: "system" }))).toBe(false);
  });
  it.each([null, undefined, "", "invalid", "e30.bad!.signature"])("does not crash for invalid input %s", value => {
    expect(isMarketReportToken(value)).toBe(false);
  });
});
