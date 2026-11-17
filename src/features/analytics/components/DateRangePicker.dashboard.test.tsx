import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { renderComponent } from "../../../shared/testing/hookHarness";
import { useAnalyticsDateRange } from "./DateRangePicker";
let mounted:ReturnType<typeof renderComponent>|undefined;
afterEach(()=>mounted?.unmount());
function Probe(){useAnalyticsDateRange();const l=useLocation();return <div>{l.search}</div>;}
describe("date initialization preserves shared dashboard destination",()=>{
  it.each(["?dashboard=usage","?dashboard=usage&from=invalid&to=invalid"])("keeps the statistics tab while initializing %s",search=>{
    mounted=renderComponent(<MemoryRouter initialEntries={["/"+search]}><Probe/></MemoryRouter>);
    const result=new URLSearchParams(mounted.container.textContent??"");
    expect(result.get("dashboard")).toBe("usage");expect(result.get("from")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
