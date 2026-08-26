import { describe, expect, it, vi } from "vitest";
import { ResponsiveTable } from "./ResponsiveTable";
import { renderComponent } from "../testing/hookHarness";

// jsdom khong co matchMedia, ma Table cua antd goi no khi mount.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const isMobileMock = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useIsMobile", () => ({ useIsMobile: isMobileMock }));

interface Row {
  id: string;
  name: string;
}

const rows: Row[] = [
  { id: "1", name: "Toan roi rac" },
  { id: "2", name: "Giai tich" },
];

function tableEl(withCards: boolean) {
  return (
    <ResponsiveTable<Row>
      rowKey="id"
      dataSource={rows}
      columns={[{ title: "Ten", dataIndex: "name" }]}
      pagination={false}
      renderMobileCard={
        withCards ? (row) => <div data-testid="card">the - {row.name}</div> : undefined
      }
    />
  );
}

describe("ResponsiveTable", () => {
  it("laptop: van la bang antd day du cot", () => {
    isMobileMock.mockReturnValue(false);
    const { container, unmount } = renderComponent(tableEl(true));

    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelectorAll('[data-testid="card"]')).toHaveLength(0);
    expect(container.textContent).toContain("Ten");
    unmount();
  });

  it("dien thoai: doi thanh danh sach the, khong con bang de cuon ngang", () => {
    isMobileMock.mockReturnValue(true);
    const { container, unmount } = renderComponent(tableEl(true));

    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelectorAll('[data-testid="card"]')).toHaveLength(2);
    expect(container.textContent).toContain("Toan roi rac");
    unmount();
  });

  it("dien thoai nhung trang chua khai bao the: giu nguyen bang cu", () => {
    isMobileMock.mockReturnValue(true);
    const { container, unmount } = renderComponent(tableEl(false));

    // Khong co `renderMobileCard` thi component phai hanh xu y het `Table` — day la dieu kien de
    // ap dan cho hon 80 man hinh ma khong phai sua het trong mot lan.
    expect(container.querySelector("table")).not.toBeNull();
    unmount();
  });
});
