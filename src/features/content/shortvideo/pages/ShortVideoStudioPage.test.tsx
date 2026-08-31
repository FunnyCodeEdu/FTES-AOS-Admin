import { describe, expect, it, vi } from "vitest";
import { renderComponent } from "../../../../shared/testing/hookHarness";

// change admin-shortvideo-studio — trang ở trạng thái RỖNG và ĐANG TẢI.
//
// Backend `shortvideo` đang được viết song song ở phiên khác nên KHÔNG có API thật để gọi: mọi
// hook dữ liệu bị thay bằng bản giả ở đây. Test này vì thế chỉ khẳng định phần FE tự chịu trách
// nhiệm — trang dựng được, hai phần của hợp đồng cùng có mặt, và hai trạng thái dễ vỡ nhất
// (chưa có clip nào / đang tải) hiện đúng thứ cần hiện thay vì màn hình trắng.

// jsdom không có matchMedia, nhưng antd (Table, Grid.useBreakpoint) gọi nó khi render.
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

const clipsMock = vi.hoisted(() => vi.fn());
// jsdom trả matchMedia luôn `matches:false` ⇒ `useIsMobile` thật sẽ coi MỌI test là điện thoại
// (mọi breakpoint đều false nên `!screens.md` là true). Điều khiển tay để test đúng nhánh muốn
// kiểm — cùng cách `ResponsiveTable.test.tsx` đang làm.
const isMobileMock = vi.hoisted(() => vi.fn(() => false));

vi.mock("../../../../shared/hooks/useIsMobile", () => ({ useIsMobile: isMobileMock }));

vi.mock("../api/shortvideo.api", () => ({
  useClips: clipsMock,
  useCreateHighlights: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useHighlightJob: () => ({ data: undefined }),
  useCreateClip: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteClip: () => ({ mutate: vi.fn(), isPending: false }),
  usePublishClip: () => ({ mutate: vi.fn(), isPending: false }),
  useUnpublishClip: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("../../../academic/courses/api/courses.api", () => ({
  useCourses: () => ({ data: { items: [], total: 0 }, isLoading: false }),
  useCourse: () => ({ data: undefined, isLoading: false }),
}));

vi.mock("../../../academic/lessons/api/lessons.api", () => ({
  useLessonStream: () => ({ data: null, isLoading: false }),
  useLessonPreview: () => ({ data: undefined }),
}));

// `<Can>` hỏi quyền qua useMe → react-query. Trả thẳng người dùng có quyền để nút Publish/Xoá
// vẫn render (nếu không thì test "rỗng" vô tình đúng vì mọi thứ bị ẩn).
vi.mock("../../../auth/api", () => ({
  useMe: () => ({
    data: { permissions: ["shortvideo.manage"], scopedGrants: [], superAdmin: false },
  }),
}));

const { default: ShortVideoStudioPage } = await import("./ShortVideoStudioPage");
const { ClipStudioPanel } = await import("../components/ClipStudioPanel");

function clipsState(over: Record<string, unknown>) {
  return {
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...over,
  };
}

describe("ShortVideoStudioPage", () => {
  it("dựng được cả hai phần của hợp đồng: Tạo clip và Studio", () => {
    isMobileMock.mockReturnValue(false);
    clipsMock.mockReturnValue(clipsState({ data: { items: [], total: 0 } }));
    const { container, unmount } = renderComponent(<ShortVideoStudioPage />);

    expect(container.textContent).toContain("Studio video ngắn");
    expect(container.textContent).toContain("Tạo clip");
    expect(container.textContent).toContain("Studio");
    unmount();
  });

  it("tab mặc định là Tạo clip và chỉ đường khi chưa chọn bài học", () => {
    isMobileMock.mockReturnValue(false);
    clipsMock.mockReturnValue(clipsState({ data: { items: [], total: 0 } }));
    const { container, unmount } = renderComponent(<ShortVideoStudioPage />);

    expect(container.textContent).toContain("Đề xuất highlight");
    expect(container.textContent).toContain("Chọn bài học có video");
    unmount();
  });
});

describe("ClipStudioPanel", () => {
  it("rỗng: nói rõ chưa có clip nào và chỉ sang tab Tạo clip", () => {
    isMobileMock.mockReturnValue(false);
    clipsMock.mockReturnValue(clipsState({ data: { items: [], total: 0 } }));
    const { container, unmount } = renderComponent(<ClipStudioPanel />);

    expect(container.textContent).toContain("Chưa có clip nào");
    // Rỗng KHÁC hỏng: không được hiện khối lỗi đỏ khi chỉ là chưa có dữ liệu.
    expect(container.textContent).not.toContain("Không tải được danh sách clip");
    unmount();
  });

  it("rỗng trên điện thoại: vẫn là câu chỉ đường, không phải bảng rỗng câm", () => {
    isMobileMock.mockReturnValue(true);
    clipsMock.mockReturnValue(clipsState({ data: { items: [], total: 0 } }));
    const { container, unmount } = renderComponent(<ClipStudioPanel />);

    expect(container.querySelector("table")).toBeNull();
    expect(container.textContent).toContain("Chưa có clip nào");
    unmount();
  });

  it("đang tải: hiện trạng thái chờ chứ không phải màn hình rỗng", () => {
    isMobileMock.mockReturnValue(false);
    clipsMock.mockReturnValue(clipsState({ isLoading: true, isFetching: true }));
    const { container, unmount } = renderComponent(<ClipStudioPanel />);

    // antd phủ Spin LÊN TRÊN bảng, phần thân rỗng vẫn nằm dưới lớp phủ — nên chỉ khẳng định có
    // lớp chờ, không khẳng định "không thấy chữ rỗng" (đó là chi tiết cài đặt của antd).
    expect(container.querySelector(".ant-spin")).not.toBeNull();
    unmount();
  });

  it("đang tải trên điện thoại: khung xương thẻ, không phải danh sách rỗng", () => {
    isMobileMock.mockReturnValue(true);
    clipsMock.mockReturnValue(clipsState({ isLoading: true, isFetching: true }));
    const { container, unmount } = renderComponent(<ClipStudioPanel />);

    expect(container.querySelector(".ant-skeleton")).not.toBeNull();
    unmount();
  });

  it("lỗi: hiện khối báo lỗi kèm nút thử lại", () => {
    isMobileMock.mockReturnValue(false);
    clipsMock.mockReturnValue(
      clipsState({ isError: true, error: new Error("BE chưa lên"), data: { items: [], total: 0 } })
    );
    const { container, unmount } = renderComponent(<ClipStudioPanel />);

    expect(container.textContent).toContain("Không tải được danh sách clip");
    expect(container.textContent).toContain("Thử lại");
    unmount();
  });
});
