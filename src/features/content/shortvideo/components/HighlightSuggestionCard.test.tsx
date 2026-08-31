import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComponent } from "../../../../shared/testing/hookHarness";

// change admin-shortvideo-studio — CHỐNG BẤM "Cắt clip" HAI LẦN trên cùng một đề xuất.
//
// Vì sao đáng một test riêng: hợp đồng chung §3 KHÔNG hứa `POST /clips` idempotent, mà clip cắt
// xong lại nằm ở tab khác — nên nếu thẻ không đổi gì sau khi gửi, admin rất dễ tưởng bấm hụt và bấm
// lại. Hậu quả không phải lỗi màn hình mà là hai job ffmpeg cho cùng một đoạn + hai dòng rác phải
// xoá tay. Đây đúng là "phần logic dễ sai" mà hợp đồng bắt phải có unit test.

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

// jsdom báo mọi breakpoint là false ⇒ `useIsMobile` thật coi mọi test là điện thoại. Ghim về laptop
// cho khỏi phụ thuộc vào nhánh giao diện — luật chống bấm lặp là một, không phân biệt màn hình.
vi.mock("../../../../shared/hooks/useIsMobile", () => ({ useIsMobile: () => false }));

const { HighlightSuggestionCard, cutSignatureOf } = await import("./HighlightSuggestionCard");

const suggestion = {
  id: "sug-1",
  startMs: 60_000,
  endMs: 105_000,
  title: "Đoạn giảng hay",
  reason: "Giải thích thuật toán bằng ví dụ đời thường",
  rank: 1,
};

function cutButton(root: ParentNode) {
  return Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find((el) =>
    /Cắt clip|Đã gửi cắt/.test(el.textContent ?? "")
  );
}

describe("cutSignatureOf", () => {
  it("cùng mốc + cùng tiêu đề ⇒ cùng chữ ký (khoảng trắng thừa không tính là khác)", () => {
    expect(cutSignatureOf({ startMs: 1000, endMs: 5000, title: "A" })).toBe(
      cutSignatureOf({ startMs: 1000, endMs: 5000, title: "  A  " })
    );
  });

  it("đổi mốc hoặc đổi tiêu đề ⇒ chữ ký khác, vì đó là một clip khác", () => {
    const base = cutSignatureOf({ startMs: 1000, endMs: 5000, title: "A" });
    expect(cutSignatureOf({ startMs: 1000, endMs: 6000, title: "A" })).not.toBe(base);
    expect(cutSignatureOf({ startMs: 1000, endMs: 5000, title: "B" })).not.toBe(base);
  });
});

describe("HighlightSuggestionCard — chống cắt trùng", () => {
  const onCut = vi.fn();
  beforeEach(() => onCut.mockClear());

  it("chưa gửi lần nào: nút bấm được và gửi đúng mốc đang hiện", async () => {
    const { container, unmount } = renderComponent(
      <HighlightSuggestionCard
        suggestion={suggestion}
        videoDurationMs={600_000}
        cutting={false}
        lastCutSignature={null}
        onCut={onCut}
      />
    );

    const button = cutButton(container);
    expect(button?.disabled).toBe(false);
    await act(async () => {
      button?.click();
    });

    expect(onCut).toHaveBeenCalledWith({
      suggestionId: "sug-1",
      startMs: 60_000,
      endMs: 105_000,
      title: "Đoạn giảng hay",
    });
    unmount();
  });

  it("đã gửi đúng khoảng này: nút khoá lại và nói ra là đã gửi, bấm nữa KHÔNG gửi lần hai", async () => {
    const { container, unmount } = renderComponent(
      <HighlightSuggestionCard
        suggestion={suggestion}
        videoDurationMs={600_000}
        cutting={false}
        lastCutSignature={cutSignatureOf({
          startMs: 60_000,
          endMs: 105_000,
          title: "Đoạn giảng hay",
        })}
        onCut={onCut}
      />
    );

    const button = cutButton(container);
    expect(button?.disabled).toBe(true);
    expect(container.textContent).toContain("Đã gửi cắt");
    await act(async () => {
      button?.click();
    });
    expect(onCut).not.toHaveBeenCalled();
    unmount();
  });

  it("đã gửi khoảng KHÁC: vẫn cắt được — sửa mốc rồi cắt lại là chủ ý, không phải bấm nhầm", () => {
    const { container, unmount } = renderComponent(
      <HighlightSuggestionCard
        suggestion={suggestion}
        videoDurationMs={600_000}
        cutting={false}
        // Lần trước gửi 60s→90s; thẻ đang hiện 60s→105s nên đây là một clip khác.
        lastCutSignature={cutSignatureOf({
          startMs: 60_000,
          endMs: 90_000,
          title: "Đoạn giảng hay",
        })}
        onCut={onCut}
      />
    );

    expect(cutButton(container)?.disabled).toBe(false);
    expect(container.textContent).not.toContain("Đã gửi cắt");
    unmount();
  });
});
