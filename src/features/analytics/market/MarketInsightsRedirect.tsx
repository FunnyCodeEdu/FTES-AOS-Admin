import { Navigate, useLocation } from "react-router-dom";

/** Keep old report links usable while all statistics live in the shared root dashboard. */
export default function MarketInsightsRedirect() {
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  search.set("dashboard", "usage");
  return <Navigate to={{ pathname: "/", search: search.toString() }} replace />;
}
