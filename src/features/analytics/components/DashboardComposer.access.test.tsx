import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { renderComponent } from "../../../shared/testing/hookHarness";
const mocks=vi.hoisted(()=>({me:vi.fn()}));
vi.mock("../../auth/api",()=>({useMe:mocks.me}));
vi.mock("../market/MarketInsightsPage",()=>({default:()=> <div>USAGE_STATISTICS</div>}));
vi.mock("./DateRangePicker",()=>({DateRangePicker:()=> <div>DATE_RANGE</div>,useAnalyticsDateRange:()=>({range:{from:"2026-11-01",to:"2026-11-17"}})}));
vi.mock("./OverviewWidget",()=>({OverviewWidget:()=> <div>ADMIN_OVERVIEW</div>}));
vi.mock("./DomainWidget",()=>({DomainWidget:({domain}:{domain:string})=> <div>DOMAIN_{domain}</div>}));
vi.mock("./ModerationWidget",()=>({ModerationWidget:()=> <div>MODERATION</div>}));
vi.mock("./ContributionWidget",()=>({ContributionWidget:()=> <div>CONTRIBUTIONS</div>}));
vi.mock("../../dashboard/QuickActions",()=>({QuickActions:()=> <div>ADMIN_QUICK_ACTIONS</div>}));
window.matchMedia ??= ((media:string)=>({media,matches:false,onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent:()=>false})) as typeof window.matchMedia;
const {DashboardComposer}=await import("./DashboardComposer");
let mounted:ReturnType<typeof renderComponent>|undefined;
beforeEach(()=>mocks.me.mockReturnValue({data:{permissions:[],superAdmin:false}}));
afterEach(()=>mounted?.unmount());
function view(){mounted=renderComponent(<MemoryRouter><DashboardComposer/></MemoryRouter>);return mounted.container;}
describe("one admin dashboard, permission-specific contents",()=>{
  it("reviewer root renders only usage without management widgets",()=>{
    mocks.me.mockReturnValue({data:{permissions:["analytics.market.view","analytics.market.readonly"],superAdmin:false}});
    const root=view();expect(root.textContent).toContain("USAGE_STATISTICS");expect(root.textContent).not.toContain("ADMIN_QUICK_ACTIONS");
    expect(root.querySelector('[role="tab"]')).toBeNull();
  });
  it("ordinary admin retains administration and can open the statistics tab",()=>{
    mocks.me.mockReturnValue({data:{permissions:["analytics.market.view","admin.analytics.read"],superAdmin:false}});
    const root=view();expect(root.textContent).toContain("ADMIN_OVERVIEW");
    const tab=[...root.querySelectorAll('[role="tab"]')].find(x=>x.textContent==="Thống kê sử dụng");
    expect(tab).toBeDefined();act(()=>(tab as HTMLElement).click());expect(root.textContent).toContain("USAGE_STATISTICS");
  });
  it("super-admin bypass also applies to dashboard widgets",()=>{
    mocks.me.mockReturnValue({data:{permissions:[],superAdmin:true}});
    const root=view();expect(root.textContent).toContain("ADMIN_OVERVIEW");expect(root.textContent).toContain("DOMAIN_business");expect(root.textContent).toContain("MODERATION");
  });
  it("unrelated scoped accounts do not acquire market-report access",()=>{
    expect(view().textContent).not.toContain("USAGE_STATISTICS");
  });
});
