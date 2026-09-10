import { act, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestQueryClient, renderComponent } from "../../../../shared/testing/hookHarness";
import { ApiError } from "../../../../shared/api/client";
import type { LessonContent } from "../types";
import { useLessonDraftStore } from "../store/lessonDraftStore";

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

const mocks = vi.hoisted(() => ({
  put: vi.fn(),
  errorToast: vi.fn(),
}));

vi.mock("../../../../shared/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../shared/api/client")>();
  return {
    ...actual,
    coreClient: { put: mocks.put },
  };
});

vi.mock("antd", async (importOriginal) => {
  const actual = await importOriginal<typeof import("antd")>();
  return {
    ...actual,
    message: { ...actual.message, error: mocks.errorToast },
  };
});

vi.mock("../../../../shared/permissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../shared/permissions")>();
  return {
    ...actual,
    Can: ({ children }: { children: ReactNode }) => children,
  };
});

vi.mock("./MarkdownPreview", () => ({ MarkdownPreview: () => null }));
vi.mock("../../ai-assist/components/LessonAiDraftPanel", () => ({
  LessonAiDraftPanel: () => null,
}));
vi.mock("../../ai-assist/components/ChallengeGenerateModal", () => ({
  ChallengeGenerateModal: () => null,
}));
vi.mock("../../ai-assist/components/LessonDocGenerateModal", () => ({
  LessonDocGenerateModal: () => null,
}));

const { LessonContentEditor } = await import("./LessonContentEditor");

const lesson: LessonContent = {
  lessonId: "lesson-1",
  lessonType: "DOCUMENT",
  body: "Nội dung cũ",
  hasContent: true,
  updatedAt: "2026-09-10T01:00:00Z",
};

function renderEditor(value: LessonContent = lesson) {
  const client = createTestQueryClient();
  const rendered = renderComponent(
    <QueryClientProvider client={client}>
      <LessonContentEditor lesson={value} />
    </QueryClientProvider>
  );
  const textarea = rendered.container.querySelector("textarea");
  if (!textarea) throw new Error("Không tìm thấy editor textarea");
  return { ...rendered, textarea };
}

function renderSwitchableEditor(initial: LessonContent = lesson) {
  const client = createTestQueryClient();
  let setLesson: (value: LessonContent) => void = () => {
    throw new Error("Editor chưa mount");
  };

  function Probe() {
    const [current, setCurrent] = useState(initial);
    setLesson = setCurrent;
    return <LessonContentEditor lesson={current} />;
  }

  const rendered = renderComponent(
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>
  );
  const textarea = rendered.container.querySelector("textarea");
  if (!textarea) throw new Error("Không tìm thấy editor textarea");
  return {
    ...rendered,
    textarea,
    rerenderLesson: (value: LessonContent) => act(() => setLesson(value)),
  };
}

function changeTextarea(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (!setter) throw new Error("jsdom không có textarea value setter");
  act(() => {
    setter.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function saveButton(root: ParentNode): HTMLButtonElement {
  const button = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (item) => item.textContent?.trim() === "Lưu"
  );
  if (!button) throw new Error("Không tìm thấy nút Lưu");
  return button;
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  mocks.put.mockReset();
  mocks.errorToast.mockReset();
  useLessonDraftStore.setState({ drafts: {} });
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("LessonContentEditor autosave", () => {
  it("không PUT body chỉ có khoảng trắng và giải thích lỗi ngay trong editor", async () => {
    const view = renderEditor();
    changeTextarea(view.textarea, "   \n");

    expect(view.container.textContent).toContain("Nội dung bài học không được để trống.");
    expect(saveButton(view.container).disabled).toBe(true);

    await advance(10_000);
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.errorToast).not.toHaveBeenCalled();
    view.unmount();
  });

  it("server từ chối body hợp lệ thì chỉ thử tự lưu và báo lỗi đúng một lần", async () => {
    mocks.put.mockRejectedValue(new Error("Không lưu được nội dung"));
    const view = renderEditor();
    changeTextarea(view.textarea, "Nội dung mới");

    await advance(1_501);
    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(mocks.errorToast).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain("Không lưu được nội dung");

    // Mutation error làm component render lại, nhưng không được hẹn lại cùng revision/body.
    await advance(10_000);
    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(mocks.errorToast).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("sửa body sau một lần lỗi thì revision mới vẫn được autosave", async () => {
    mocks.put
      .mockRejectedValueOnce(new Error("Lỗi tạm thời"))
      .mockResolvedValueOnce({ data: { updatedAt: "2026-09-10T01:01:00Z" } });
    const view = renderEditor();

    changeTextarea(view.textarea, "Bản thứ nhất");
    await advance(1_501);
    expect(mocks.put).toHaveBeenCalledTimes(1);

    changeTextarea(view.textarea, "Bản thứ hai");
    await advance(1_501);
    expect(mocks.put).toHaveBeenCalledTimes(2);
    expect(mocks.put.mock.calls[1][1]).toMatchObject({ bodyMd: "Bản thứ hai" });

    // Prop phía cha trong test vẫn là body cũ. Snapshot sạch trong draft phải giữ textarea ở bản
    // vừa lưu và không được autosave ngược body cũ lần nữa.
    expect(view.textarea.value).toBe("Bản thứ hai");
    await advance(10_000);
    expect(mocks.put).toHaveBeenCalledTimes(2);
    view.unmount();
  });

  it("sau lỗi, nút Lưu cho phép retry tường minh cùng body mà không mở lại vòng auto-retry", async () => {
    mocks.put
      .mockRejectedValueOnce(new Error("Lỗi tạm thời"))
      .mockResolvedValueOnce({ data: { updatedAt: "2026-09-10T01:02:00Z" } });
    const view = renderEditor();
    changeTextarea(view.textarea, "Giữ nguyên body này");
    await advance(1_501);

    await act(async () => {
      saveButton(view.container).click();
      await Promise.resolve();
    });
    await advance(0);

    expect(mocks.put).toHaveBeenCalledTimes(2);
    expect(mocks.put.mock.calls[1][1]).toMatchObject({ bodyMd: "Giữ nguyên body này" });
    await advance(10_000);
    expect(mocks.put).toHaveBeenCalledTimes(2);
    expect(mocks.errorToast).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("giữ base updatedAt của draft khi query nền refetch phiên bản server mới", async () => {
    mocks.put.mockResolvedValue({ data: { updatedAt: "2026-09-10T01:03:00Z" } });
    const view = renderSwitchableEditor();
    changeTextarea(view.textarea, "Draft đang gõ");

    // Mô phỏng refetch thấy người khác đã lưu. Draft vẫn phải gửi base t0 để BE trả 409, không
    // được nhảy expectedUpdatedAt lên t1 rồi lặng lẽ ghi đè nội dung mới của người kia.
    view.rerenderLesson({
      ...lesson,
      body: "Nội dung người khác vừa lưu",
      updatedAt: "2026-09-10T01:02:30Z",
    });
    await advance(1_501);

    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(mocks.put.mock.calls[0][1]).toMatchObject({
      bodyMd: "Draft đang gõ",
      expectedUpdatedAt: lesson.updatedAt,
    });
    view.unmount();
  });

  it("đổi lesson huỷ timer cũ và reset state autosave cho lesson mới", async () => {
    mocks.put.mockResolvedValue({ data: { updatedAt: "2026-09-10T02:01:00Z" } });
    const view = renderSwitchableEditor();
    changeTextarea(view.textarea, "Không được gửi sang lesson mới");

    const nextLesson: LessonContent = {
      ...lesson,
      lessonId: "lesson-2",
      body: "Nội dung lesson 2",
      updatedAt: "2026-09-10T02:00:00Z",
    };
    view.rerenderLesson(nextLesson);
    await advance(2_000);
    expect(mocks.put).not.toHaveBeenCalled();
    expect(view.textarea.value).toBe(nextLesson.body);

    changeTextarea(view.textarea, "Nội dung mới lesson 2");
    await advance(1_501);
    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(mocks.put.mock.calls[0][0]).toBe("/lessons/lesson-2/content");
    view.unmount();
  });

  it("chỉ có một PUT in-flight và giữ body mới hơn để autosave tiếp sau response cũ", async () => {
    let resolveFirst!: (value: { data: { updatedAt: string } }) => void;
    mocks.put
      .mockImplementationOnce(
        () => new Promise<{ data: { updatedAt: string } }>((resolve) => {
          resolveFirst = resolve;
        })
      )
      .mockResolvedValueOnce({ data: { updatedAt: "2026-09-10T01:05:00Z" } });
    const view = renderEditor();
    changeTextarea(view.textarea, "Snapshot đang lưu");
    await advance(1_501);
    expect(mocks.put).toHaveBeenCalledTimes(1);

    // AI/modal có thể cập nhật draft trong lúc textarea bị khoá vì request cũ đang bay.
    act(() => {
      useLessonDraftStore.getState().setDraft(
        lesson.lessonId,
        "Body mới hơn",
        lesson.body,
        lesson.updatedAt
      );
    });
    await advance(2_000);
    expect(mocks.put).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst({ data: { updatedAt: "2026-09-10T01:04:00Z" } });
      await Promise.resolve();
    });
    await advance(1_501);

    expect(mocks.put).toHaveBeenCalledTimes(2);
    expect(mocks.put.mock.calls[1][1]).toMatchObject({
      bodyMd: "Body mới hơn",
      expectedUpdatedAt: "2026-09-10T01:04:00Z",
    });
    view.unmount();
  });

  it("vẫn xác nhận draft khi rời trang trong lúc request đang bay", async () => {
    let resolveSave!: (value: { data: { updatedAt: string } }) => void;
    mocks.put.mockImplementationOnce(
      () => new Promise<{ data: { updatedAt: string } }>((resolve) => {
        resolveSave = resolve;
      })
    );
    const view = renderEditor();
    changeTextarea(view.textarea, "Nội dung đã lưu khi rời trang");
    await advance(1_501);
    expect(mocks.put).toHaveBeenCalledTimes(1);

    // TanStack Query bỏ callback truyền cho mutate sau unmount. Luồng mutateAsync phải vẫn
    // acknowledge snapshot, nếu không lần mở lại sẽ gửi base cũ và nhận 409 giả.
    view.unmount();
    await act(async () => {
      resolveSave({ data: { updatedAt: "2026-09-10T01:06:00Z" } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(useLessonDraftStore.getState().drafts[lesson.lessonId]).toEqual({
      body: "Nội dung đã lưu khi rời trang",
      baseBody: "Nội dung đã lưu khi rời trang",
      baseUpdatedAt: "2026-09-10T01:06:00Z",
    });

    const reopened = renderEditor({
      ...lesson,
      body: "Nội dung đã lưu khi rời trang",
      updatedAt: "2026-09-10T01:06:00Z",
    });
    await advance(2_000);
    expect(reopened.textarea.value).toBe("Nội dung đã lưu khi rời trang");
    expect(mocks.put).toHaveBeenCalledTimes(1);
    reopened.unmount();
  });

  it("nhận mã LESSON_CONTENT_STALE trong ApiError và dừng autosave kể cả khi body đổi", async () => {
    mocks.put.mockRejectedValue(
      new ApiError(409, "Bài này vừa được sửa ở nơi khác", false, "LESSON_CONTENT_STALE")
    );
    const view = renderEditor();
    changeTextarea(view.textarea, "Draft có base cũ");
    await advance(1_501);
    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain("tải lại trước khi lưu tiếp");

    changeTextarea(view.textarea, "Đổi chữ cũng không thể làm base mới");
    await advance(10_000);
    expect(mocks.put).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("đọc LESSON_TYPE_MISMATCH từ ApiError.errorCode để hiện thông báo đúng", async () => {
    mocks.put.mockRejectedValue(
      new ApiError(400, "Lesson is not DOCUMENT type", false, "LESSON_TYPE_MISMATCH")
    );
    const view = renderEditor();
    changeTextarea(view.textarea, "Nội dung");
    await advance(1_501);

    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(mocks.errorToast).toHaveBeenCalledWith(
      "Loại bài học không hỗ trợ nội dung markdown (LESSON_TYPE_MISMATCH)"
    );
    expect(view.container.textContent).toContain("Loại bài học không hỗ trợ nội dung markdown");
    view.unmount();
  });
});
