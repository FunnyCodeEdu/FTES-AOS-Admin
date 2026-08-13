import { describe, expect, it } from "vitest";
import { needsTagFollowUp, normalizeChallengeTags } from "./CreateBankChallengeModal";

// Tag đi KÈM lượt tạo (change admin-paper-multifile §3). Hai hàm dưới đây giữ đúng hai lời hứa:
//  1. gửi lên đúng bộ tag người dùng thấy, không rác;
//  2. không bao giờ để lại một thử thách "đã tạo mà không có tag" chỉ vì bản BE đang chạy chưa đọc
//     `tags` trong lượt tạo.

describe("normalizeChallengeTags", () => {
  it("bỏ khoảng trắng thừa và ô rỗng", () => {
    expect(normalizeChallengeTags(["  PE ", "", "   ", "MAE101"])).toEqual(["PE", "MAE101"]);
  });

  it("khử trùng KHÔNG phân biệt hoa thường, giữ dạng gõ ĐẦU TIÊN", () => {
    // BE chuẩn hoá về slug nên "PE" và "pe" là một tag; gửi cả hai chỉ ăn mất một chỗ của trần 32.
    expect(normalizeChallengeTags(["PE", "pe", "Pe"])).toEqual(["PE"]);
  });

  it("giữ nguyên thứ tự người dùng chọn", () => {
    expect(normalizeChallengeTags(["MAE101", "PE"])).toEqual(["MAE101", "PE"]);
  });

  it("vắng/rỗng ⇒ mảng rỗng, không ném", () => {
    expect(normalizeChallengeTags(undefined)).toEqual([]);
    expect(normalizeChallengeTags(null)).toEqual([]);
    expect(normalizeChallengeTags([])).toEqual([]);
  });
});

describe("needsTagFollowUp", () => {
  it("không yêu cầu tag nào ⇒ không có gì để gọi bù", () => {
    expect(needsTagFollowUp([], { tags: null })).toBe(false);
    expect(needsTagFollowUp([], undefined)).toBe(false);
  });

  it("BE CŨ (không echo `tags`) ⇒ phải gọi bù, nếu không đề tạo ra sẽ không có tag nào", () => {
    expect(needsTagFollowUp(["PE", "MAE101"], { tags: null })).toBe(true);
    expect(needsTagFollowUp(["PE"], {})).toBe(true);
    expect(needsTagFollowUp(["PE"], undefined)).toBe(true);
  });

  it("BE MỚI đã áp đủ tag ⇒ KHÔNG gọi lệnh thứ hai (so theo slug, bỏ qua hoa thường)", () => {
    expect(
      needsTagFollowUp(["PE", "MAE101"], {
        tags: [
          { slug: "pe", label: "PE" },
          { slug: "mae101", label: "MAE101" },
        ],
      })
    ).toBe(false);
  });

  it("BE chỉ áp được một phần ⇒ vẫn gọi bù cho đủ bộ", () => {
    expect(needsTagFollowUp(["PE", "MAE101"], { tags: [{ slug: "pe", label: "PE" }] })).toBe(true);
  });

  it("BE trả mảng rỗng (không nhận field) ⇒ gọi bù", () => {
    expect(needsTagFollowUp(["PE"], { tags: [] })).toBe(true);
  });

  it("BE tự suy thêm tag ngoài bộ yêu cầu vẫn KHÔNG cần gọi bù", () => {
    // `PUT /tags` là replace-set: gọi bù lúc này sẽ XOÁ mất tag server vừa tự suy ra.
    expect(
      needsTagFollowUp(["PE"], {
        tags: [
          { slug: "pe", label: "PE" },
          { slug: "mae101", label: "MAE101" },
        ],
      })
    ).toBe(false);
  });
});
