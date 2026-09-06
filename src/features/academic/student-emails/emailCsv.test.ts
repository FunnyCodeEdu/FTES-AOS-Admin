import { describe, expect, it } from "vitest";
import { buildEmailCsv, uniqueEmails } from "./emailCsv";
import type { StudentEmailRow } from "./types";

function row(over: Partial<StudentEmailRow> = {}): StudentEmailRow {
  return {
    userId: "u1",
    username: "hocvien1",
    email: "a@x.com",
    courseId: "c1",
    courseTitle: "Khoá A",
    courseCode: "AAA101",
    packageId: "p1",
    packageName: "Gói Zoom",
    active: true,
    joinedAt: "2026-08-15T10:00:00Z",
    source: "PACKAGE",
    ...over,
  };
}

describe("buildEmailCsv", () => {
  it("có tiêu đề cột và một dòng cho mỗi bản ghi", () => {
    const csv = buildEmailCsv([row(), row({ email: "b@x.com" })]);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("email");
    expect(lines[1]).toContain("a@x.com");
  });

  it("dấu phẩy trong tên khoá KHÔNG làm lệch cột", () => {
    // Tên khoá tiếng Việt thường có dấu phẩy; một ô sót sẽ đẩy mọi cột sau nó sang phải và chỉ lộ
    // ra khi ai đó đọc nhầm cột.
    const csv = buildEmailCsv([row({ courseTitle: "PRF192, cơ bản" })]);
    expect(csv).toContain('"PRF192, cơ bản"');
    expect(csv.split("\r\n")[1].split('","')).toHaveLength(8);
  });

  it("dấu ngoặc kép trong dữ liệu được nhân đôi đúng chuẩn", () => {
    const csv = buildEmailCsv([row({ packageName: 'Gói "Đặc biệt"' })]);
    expect(csv).toContain('"Gói ""Đặc biệt"""');
  });

  it("có BOM để Excel đọc đúng tiếng Việt", () => {
    expect(buildEmailCsv([row()]).charCodeAt(0)).toBe(0xfeff);
  });

  it("ngày đổi sang giờ VN", () => {
    // 2026-08-15T17:30Z = 16/08 00:30 giờ VN — lấy ngày UTC sẽ ghi sai hẳn một ngày.
    const csv = buildEmailCsv([row({ joinedAt: "2026-08-15T17:30:00Z" })]);
    expect(csv).toContain("2026-08-16");
  });

  it("thiếu ngày / ngày hỏng thì để trống chứ không ghi Invalid Date", () => {
    expect(buildEmailCsv([row({ joinedAt: null })])).not.toContain("Invalid");
    expect(buildEmailCsv([row({ joinedAt: "khong-phai-ngay" })])).not.toContain("Invalid");
  });

  it("gói rỗng với dòng ghi danh thẳng", () => {
    const csv = buildEmailCsv([row({ source: "ENROLLMENT", packageName: null })]);
    expect(csv).toContain('"ghi danh"');
  });
});

describe("uniqueEmails", () => {
  it("khử trùng không phân biệt hoa thường, giữ thứ tự gặp đầu tiên", () => {
    const out = uniqueEmails([
      row({ email: "A@x.com" }),
      row({ email: "b@x.com" }),
      row({ email: "a@X.com" }),
    ]);
    expect(out).toEqual(["A@x.com", "b@x.com"]);
  });

  it("bỏ qua mail rỗng", () => {
    expect(uniqueEmails([row({ email: "  " }), row({ email: "a@x.com" })])).toEqual(["a@x.com"]);
  });
});
