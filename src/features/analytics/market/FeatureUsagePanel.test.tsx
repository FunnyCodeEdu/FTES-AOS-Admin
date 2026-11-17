import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { renderComponent } from "../../../shared/testing/hookHarness";
import { FeatureUsagePanel } from "./FeatureUsagePanel";
import { actionLabel } from "./labels";
import MarketInsightsRedirect from "./MarketInsightsRedirect";
window.matchMedia ??= ((media: string)=>({media,matches:false,onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent:()=>false})) as typeof window.matchMedia;
let mounted:ReturnType<typeof renderComponent>|undefined;
afterEach(()=>mounted?.unmount());
describe("concrete feature usage",()=>{
  it("names AI tools without exposing unrecognized payload text",()=>{
    expect(actionLabel("ai.job.completed:FLASHCARDS")).toBe("Tạo flashcard AI");
    expect(actionLabel("ai.job.completed:private@example.com")).toBe("Dùng công cụ AI");
  });
  it("shows concrete actions, paid usage and truthful missing-data states",()=>{
    const onJourney=vi.fn();
    mounted=renderComponent(<FeatureUsagePanel groups={[{feature:"ai",events:8,users:3,visitors:0,paid_events:5,paid_users:2,server_events:8,browser_events:0}]}
      details={[{feature:"ai",action:"ai.job.completed:FLASHCARDS",source:"server",events:8,users:3,paid_events:5,paid_users:2}]} onJourney={onJourney} />);
    expect(mounted.container.textContent).toContain("Tạo flashcard AI");
    expect(mounted.container.textContent).toContain("Chưa có dữ liệu ghi nhận trong kỳ");
    const button=[...mounted.container.querySelectorAll("button")].find(b=>b.textContent==="Trợ lý AI");
    expect(button).toBeDefined();act(()=>button!.click());expect(onJourney).toHaveBeenCalledWith("ai");
  });
  it("old report URL resolves into shared dashboard preserving dates",()=>{
    function Destination(){const l=useLocation();return <div>{l.pathname+l.search}</div>;}
    mounted=renderComponent(<MemoryRouter initialEntries={["/analytics/market?from=2026-11-01&to=2026-11-17"]}><Routes>
      <Route path="/analytics/market" element={<MarketInsightsRedirect/>}/><Route path="/" element={<Destination/>}/>
    </Routes></MemoryRouter>);
    expect(mounted.container.textContent).toBe("/?from=2026-11-01&to=2026-11-17&dashboard=usage");
  });
});
