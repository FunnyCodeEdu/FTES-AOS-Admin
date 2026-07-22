import { describe, expect, it } from "vitest";
import { buildEmailArray, buildEmailList, filterStudents } from "./CourseStudentsTab";
import type { StudentEmailView } from "../api/courses.api";

// Nợ quality-loop admin-course-students-roster 1.3 (phần unit): helper thuần đã export sẵn —
// filter roster client-side + danh sách email copy (dedupe, bỏ rỗng, giữ thứ tự).

const students: StudentEmailView[] = [
  { userId: "u1", username: "HaiTran", email: "hai.tran@ftes.vn" },
  { userId: "u2", username: "khoa.nguyen", email: "KHOA@ftes.vn" },
  { userId: "u3", username: "lan", email: "" },
  { userId: "u4", username: "lan2", email: "hai.tran@ftes.vn" }, // email trùng u1
];

describe("filterStudents — search client-side theo tên hoặc email", () => {
  it("query rỗng / toàn space → trả nguyên roster", () => {
    expect(filterStudents(students, "")).toEqual(students);
    expect(filterStudents(students, "   ")).toEqual(students);
  });

  it("match username không phân biệt hoa thường", () => {
    expect(filterStudents(students, "haitran").map((s) => s.userId)).toEqual(["u1"]);
    expect(filterStudents(students, "HAITRAN").map((s) => s.userId)).toEqual(["u1"]);
  });

  it("match theo email (kể cả substring)", () => {
    expect(filterStudents(students, "khoa@").map((s) => s.userId)).toEqual(["u2"]);
    expect(filterStudents(students, "@ftes.vn").map((s) => s.userId)).toEqual([
      "u1",
      "u2",
      "u4",
    ]);
  });

  it("query có space thừa được trim trước khi so", () => {
    expect(filterStudents(students, "  lan  ").map((s) => s.userId)).toEqual(["u3", "u4"]);
  });

  it("không match → mảng rỗng", () => {
    expect(filterStudents(students, "khong-ton-tai")).toEqual([]);
  });
});

describe("buildEmailArray — nguồn chân lý cho nút Copy email (n)", () => {
  it("dedupe giữ thứ tự xuất hiện đầu, bỏ email rỗng", () => {
    expect(buildEmailArray(students)).toEqual(["hai.tran@ftes.vn", "KHOA@ftes.vn"]);
  });

  it("email toàn space coi như rỗng — bị loại", () => {
    expect(
      buildEmailArray([{ userId: "x", username: "x", email: "   " }])
    ).toEqual([]);
  });

  it("roster rỗng → []", () => {
    expect(buildEmailArray([])).toEqual([]);
  });
});

describe("buildEmailList — chuỗi copy vào clipboard", () => {
  it("nối bằng ', ' sau dedupe", () => {
    expect(buildEmailList(students)).toBe("hai.tran@ftes.vn, KHOA@ftes.vn");
  });

  it("không có email → chuỗi rỗng", () => {
    expect(buildEmailList([{ userId: "x", username: "x", email: "" }])).toBe("");
  });
});
