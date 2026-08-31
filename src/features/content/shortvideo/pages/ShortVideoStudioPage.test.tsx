import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComponent, waitFor } from "../../../../shared/testing/hookHarness";

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
// Kiểu trả `unknown` cố ý: test đè bằng clip giả dựng tay, khai `{data: undefined}` thì TS chốt
// luôn kiểu là `undefined` và mọi `mockReturnValue` sau đó đỏ.
const clipMock = vi.hoisted(() => vi.fn((): { data: unknown } => ({ data: undefined })));
// jsdom trả matchMedia luôn `matches:false` ⇒ `useIsMobile` thật sẽ coi MỌI test là điện thoại
// (mọi breakpoint đều false nên `!screens.md` là true). Điều khiển tay để test đúng nhánh muốn
// kiểm — cùng cách `ResponsiveTable.test.tsx` đang làm.
const isMobileMock = vi.hoisted(() => vi.fn(() => false));

vi.mock("../../../../shared/hooks/useIsMobile", () => ({ useIsMobile: isMobileMock }));

vi.mock("../api/shortvideo.api", () => ({
  useClips: clipsMock,
  useClip: clipMock,
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

type ClipOverrides = Record<string, unknown>;

/** Một dòng clip đủ field bắt buộc — test chỉ đè cái nó quan tâm. */
function clipRow(over: ClipOverrides = {}) {
  return {
    id: "clip-1",
    videoId: "video_abc",
    startMs: 60_000,
    endMs: 105_000,
    title: "Đoạn giảng hay",
    status: "READY",
    clipUrl: "https://cdn.example/clip-1.mp4",
    durationSeconds: 45,
    createdAt: "2026-08-31T03:00:00Z",
    ...over,
  };
}

/** Nút theo nhãn, tìm trong CẢ portal (Drawer của antd render ra ngoài container). */
function buttonByText(root: ParentNode, label: string) {
  return Array.from(root.querySelectorAll<HTMLElement>("button")).find((el) =>
    el.textContent?.includes(label)
  );
}

beforeEach(() => {
  clipMock.mockClear();
  clipMock.mockReturnValue({ data: undefined });
  // Drawer/Modal của antd gắn node vào body và KHÔNG tự dọn khi unmount root — dọn tay để test
  // sau không đọc nhầm chữ của test trước.
  document.body.querySelectorAll(".ant-drawer, .ant-modal-root").forEach((node) => node.remove());
});

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

  it("điện thoại: thẻ clip PHẢI có lối mở chi tiết, không thì Drawer là ngõ cụt", async () => {
    // Nhánh mobile của `ResponsiveTable` chỉ vẽ `renderMobileCard`, KHÔNG chuyển tiếp `onRow` —
    // nếu chi tiết chỉ mở được bằng click hàng thì trên điện thoại lý do cắt hỏng, mốc gốc và
    // dung lượng không có đường nào tới.
    isMobileMock.mockReturnValue(true);
    clipsMock.mockReturnValue(
      clipsState({
        data: {
          items: [clipRow({ status: "FAILED", error: "ffmpeg: thiếu segment cuối" })],
          total: 1,
        },
      })
    );
    const { container, unmount } = renderComponent(<ClipStudioPanel />);

    const open = buttonByText(container, "Xem chi tiết");
    expect(open).toBeDefined();
    await act(async () => {
      open?.click();
    });

    // Mở ĐÚNG clip vừa bấm (trước đó hook chi tiết chỉ được gọi với undefined).
    expect(clipMock).toHaveBeenCalledWith("clip-1");
    await waitFor(() => {
      const drawer = document.body.querySelector(".ant-drawer");
      expect(drawer?.textContent).toContain("ffmpeg: thiếu segment cuối");
    });
    unmount();
  });

  it("chi tiết đọc lại theo id: bản mới ĐÈ lên dòng cũ đang nằm trong bảng", async () => {
    // Drawer mở suốt trong khi clip đổi trạng thái. Dựng nó từ ảnh chụp lúc bấm thì clip đã cắt
    // xong vẫn hiện "Đang cắt" cho tới khi đóng ra mở lại.
    isMobileMock.mockReturnValue(false);
    clipsMock.mockReturnValue(
      clipsState({
        data: {
          items: [clipRow({ status: "RENDERING", clipUrl: null, durationSeconds: null })],
          total: 1,
        },
      })
    );
    clipMock.mockReturnValue({ data: clipRow({ status: "READY" }) });

    const { container, unmount } = renderComponent(<ClipStudioPanel />);
    const row = container.querySelector<HTMLElement>(".ant-table-row");
    expect(row).not.toBeNull();
    await act(async () => {
      row?.click();
    });

    await waitFor(() => {
      const drawer = document.body.querySelector(".ant-drawer");
      expect(drawer?.textContent).toContain("Sẵn sàng");
      expect(drawer?.textContent).not.toContain("Đang cắt");
    });
    unmount();
  });

  it("làm mới nền không xoá trắng danh sách trên điện thoại", () => {
    // Poll 10s bật `isFetching` liên tục; đổ nó vào `loading` thì nhánh mobile THAY thẻ bằng
    // khung xương mỗi vòng — clip đang xem biến mất dưới tay người dùng.
    isMobileMock.mockReturnValue(true);
    clipsMock.mockReturnValue(
      clipsState({ isFetching: true, data: { items: [clipRow()], total: 1 } })
    );
    const { container, unmount } = renderComponent(<ClipStudioPanel />);

    expect(container.textContent).toContain("Đoạn giảng hay");
    expect(container.querySelector(".ant-skeleton")).toBeNull();
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
