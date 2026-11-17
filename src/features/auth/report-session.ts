/** UI routing hint only; the report server independently validates signature, audience and session. */
export function isMarketReportToken(token: string | null | undefined): boolean {
  if (!token) return false;
  try {
    const payload: unknown = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload || typeof payload !== "object") return false;
    const claims = payload as Record<string, unknown>;
    return claims.iss === "ftes-market-reviewer" &&
      (claims.aud === "market-insights" || Array.isArray(claims.aud) && claims.aud.includes("market-insights"));
  } catch { return false; }
}
