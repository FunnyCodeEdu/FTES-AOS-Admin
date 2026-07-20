import { describe, expect, it } from "vitest";
import { buildEntitlementPayload, buildPackagePayload } from "./courses.api";

// Task 4.2 — admin-course-package-editor: payload gói/entitlement gửi đúng hình dạng BE.

describe("buildEntitlementPayload", () => {
  it("PART chỉ mang sectionId, không kèm selectedLessonIds", () => {
    const payload = buildEntitlementPayload({
      type: "PART",
      sectionId: "sec-1",
      selectedLessonIds: ["les-1"], // giá trị rác còn sót khi admin đổi loại — không được gửi
    });
    expect(payload).toMatchObject({ type: "PART", sectionId: "sec-1" });
    expect(payload.selectedLessonIds).toBeUndefined();
  });

  it("LESSON 3 bài + 1 bài học thử → selectedLessonIds 3 id, freeLessonIds 1 id", () => {
    const payload = buildEntitlementPayload({
      type: "LESSON",
      sectionId: "sec-1", // không thuộc loại LESSON → bỏ
      selectedLessonIds: ["l1", "l2", "l3"],
      freeLessonIds: ["l2"],
    });
    expect(payload).toMatchObject({
      type: "LESSON",
      selectedLessonIds: ["l1", "l2", "l3"],
      freeLessonIds: ["l2"],
    });
    expect(payload.sectionId).toBeUndefined();
  });

  it("mảng rỗng không được gửi lên (BE hiểu là xoá sạch)", () => {
    const payload = buildEntitlementPayload({ type: "PART", sectionId: "sec-1", freeLessonIds: [] });
    expect(payload.freeLessonIds).toBeUndefined();
  });

  it("PART ladder: giữ nguyên subset bài đã chọn của BE (không biến thành cấp trọn phần)", () => {
    const payload = buildEntitlementPayload({
      type: "PART",
      sectionId: "sec-1",
      raw: { type: "PART", sectionId: "sec-1", selectedLessonIds: ["l1", "l2", "l3", "l4"] },
    });
    // Mất subset này = gói FREE bỗng cấp TRỌN phần → rò rỉ nội dung trả phí.
    expect(payload.selectedLessonIds).toEqual(["l1", "l2", "l3", "l4"]);
  });

  it("PART đổi sang section khác thì bỏ subset cũ (id bài không thuộc phần mới)", () => {
    const payload = buildEntitlementPayload({
      type: "PART",
      sectionId: "sec-2",
      raw: { type: "PART", sectionId: "sec-1", selectedLessonIds: ["l1"] },
    });
    expect(payload).toMatchObject({ type: "PART", sectionId: "sec-2" });
    expect(payload.selectedLessonIds).toBeUndefined();
  });

  it("giữ lessonId + quyền bài tập của bản gốc (editor không có ô nhập)", () => {
    const payload = buildEntitlementPayload({
      type: "LESSON",
      selectedLessonIds: ["l2"],
      raw: {
        type: "LESSON",
        lessonId: "l1",
        selectedLessonIds: ["l2"],
        selectedExerciseIds: ["ex-1"],
        freeExerciseIds: ["ex-2"],
      },
    });
    expect(payload).toMatchObject({
      type: "LESSON",
      lessonId: "l1",
      selectedLessonIds: ["l2"],
      selectedExerciseIds: ["ex-1"],
      freeExerciseIds: ["ex-2"],
    });
  });

  it("admin đổi loại dòng thì KHÔNG kéo theo field của loại cũ", () => {
    const payload = buildEntitlementPayload({
      type: "LESSON",
      selectedLessonIds: ["l9"],
      raw: { type: "PART", sectionId: "sec-1", selectedExerciseIds: ["ex-1"] },
    });
    expect(payload).toMatchObject({ type: "LESSON", selectedLessonIds: ["l9"] });
    expect(payload.sectionId).toBeUndefined();
    expect(payload.selectedExerciseIds).toBeUndefined();
  });

  // BE course-package-course-entitlement: gói mặc định `full` mang type COURSE. Trước khi editor
  // biết type này, dòng COURSE rơi vào nhánh mặc định và bị gửi đi thành {type:"LESSON"} RỖNG —
  // PATCH thay-thế-toàn-bộ nên gói còn 1 entitlement không cấp bài nào: mọi người đã mua mất quyền.
  it("COURSE giữ nguyên type, KHÔNG kèm field phạm vi (BE trả COURSE_VALIDATION nếu có)", () => {
    const payload = buildEntitlementPayload({
      type: "COURSE",
      sectionId: "sec-1", // rác còn sót khi admin đổi loại dòng
      selectedLessonIds: ["l1"],
      freeLessonIds: ["l2"],
      raw: { type: "COURSE", freeExerciseIds: ["ex-2"] },
    });
    expect(payload).toMatchObject({
      type: "COURSE",
      freeLessonIds: ["l2"],
      freeExerciseIds: ["ex-2"], // teaser bài tập editor chưa quản → giữ lại
    });
    expect(payload.sectionId).toBeUndefined();
    expect(payload.lessonId).toBeUndefined();
    expect(payload.selectedLessonIds).toBeUndefined();
    expect(payload.selectedExerciseIds).toBeUndefined();
  });

  it("COURSE không teaser → chỉ mang type (gói mặc định `full` round-trip nguyên vẹn)", () => {
    expect(buildEntitlementPayload({ type: "COURSE", raw: { type: "COURSE" } })).toEqual({
      type: "COURSE",
    });
  });

  it("EXERCISE giữ nguyên bản gốc để PATCH không làm mất quyền editor chưa hỗ trợ", () => {
    const payload = buildEntitlementPayload({
      type: "EXERCISE",
      raw: { type: "EXERCISE", sectionId: "sec-9", selectedExerciseIds: ["ex-1", "ex-2"] },
    });
    expect(payload).toMatchObject({
      type: "EXERCISE",
      sectionId: "sec-9",
      selectedExerciseIds: ["ex-1", "ex-2"],
    });
  });
});

describe("buildPackagePayload", () => {
  it("mang đúng name/slug/salePrice/sortOrder + entitlement đã build", () => {
    expect(
      buildPackagePayload({
        name: "Gói Premium",
        slug: "premium",
        salePrice: 700000,
        sortOrder: 1,
        entitlements: [{ type: "PART", sectionId: "sec-1" }],
      })
    ).toMatchObject({
      name: "Gói Premium",
      slug: "premium",
      salePrice: 700000,
      sortOrder: 1,
      entitlements: [{ type: "PART", sectionId: "sec-1" }],
    });
  });

  it("gói không có dòng entitlement nào → entitlements rỗng (không undefined)", () => {
    expect(buildPackagePayload({ name: "Cơ bản", slug: "co-ban" }).entitlements).toEqual([]);
  });
});
