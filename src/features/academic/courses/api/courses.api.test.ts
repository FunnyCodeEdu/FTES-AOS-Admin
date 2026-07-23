import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { apiClient, coreClient } from "../../../../shared/api/client";
import {
  buildAdminCourseFilter,
  buildEntitlementPayload,
  buildPackagePayload,
  courseAdminBody,
  courseUpdatePayload,
  isPackageArchived,
  nextPackageSortOrder,
  useCreateCourse,
  useUpdateCourse,
} from "./courses.api";
import { coursesKeys } from "./courses.keys";
import type { CourseListParams, CoursePackage } from "../../types";
import { createTestQueryClient, renderHook } from "../../../../shared/testing/hookHarness";

vi.mock("../../../../shared/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../shared/api/client")>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    coreClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

const admin = apiClient as unknown as Record<"get" | "post" | "patch" | "delete", ReturnType<typeof vi.fn>>;
const core = coreClient as unknown as Record<"get" | "post" | "patch" | "delete", ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
});

// admin-course-management-refinements §5.1/§5.4 — filter Type/Subject + payload đổi type.

describe("buildAdminCourseFilter", () => {
  const base: CourseListParams = { page: 3, pageSize: 20 };

  it("courseType → filter.type (enum CourseType), subjectId gửi kèm (BE reserved)", () => {
    expect(
      buildAdminCourseFilter({ ...base, courseType: "PACKAGE", subjectId: "sub-1" })
    ).toEqual({ type: "PACKAGE", subjectId: "sub-1" });
  });

  it("không chọn gì → filter rỗng (không mang key undefined, BE hiểu là không lọc)", () => {
    expect(buildAdminCourseFilter(base)).toEqual({});
  });

  it("page/pageSize KHÔNG lọt vào filter (đi riêng qua PageInput)", () => {
    const filter = buildAdminCourseFilter({ ...base, courseType: "LEGACY" });
    expect(filter).not.toHaveProperty("page");
    expect(filter).not.toHaveProperty("pageSize");
  });

  it("search → q, sortOrder asc → ASC (đúng hợp đồng GraphQL)", () => {
    expect(
      buildAdminCourseFilter({ ...base, search: "java", sortBy: "title", sortOrder: "asc" })
    ).toEqual({ q: "java", sortBy: "title", sortOrder: "ASC" });
  });

  it("mang đủ status + lecturerId khi có — status UPPERCASE theo hợp đồng BE", () => {
    expect(
      buildAdminCourseFilter({ ...base, status: "published", lecturerId: "lec-1" })
    ).toEqual({ status: "PUBLISHED", lecturerId: "lec-1" });
  });
});

describe("courseUpdatePayload", () => {
  const values = { subjectId: "s1", name: "Khoá A", summary: "tóm tắt", saleMode: "LEGACY" as const };

  it("saleMode không đổi → KHÔNG gửi saleMode (gửi lại type cũ dễ dính guard oan khi state FE cũ)", () => {
    const payload = courseUpdatePayload(values, { saleMode: "LEGACY" });
    expect(payload).toEqual({ subjectId: "s1", name: "Khoá A", summary: "tóm tắt" });
    expect(payload).not.toHaveProperty("saleMode");
  });

  it("LEGACY → PACKAGE (nâng cấp hợp lệ) → gửi saleMode PACKAGE", () => {
    expect(
      courseUpdatePayload({ ...values, saleMode: "PACKAGE" }, { saleMode: "LEGACY" })
    ).toMatchObject({ name: "Khoá A", saleMode: "PACKAGE" });
  });

  it("form không có saleMode → không gửi", () => {
    expect(
      courseUpdatePayload({ subjectId: "s1", name: "Khoá A" }, { saleMode: "PACKAGE" })
    ).not.toHaveProperty("saleMode");
  });
});

// Hợp đồng body admin POST/PATCH /admin/courses (AdminContentController.Create/UpdateCourseBody):
// BE nhận title/description — gửi name/summary là title=null → tên không persist + audit
// Map.of("title", null) NPE → 500 cho MỌI lần Lưu/Tạo.
describe("courseAdminBody", () => {
  it("map name→title, summary→description, subjectId giữ nguyên", () => {
    expect(courseAdminBody({ subjectId: "s1", name: "Khoá A", summary: "tóm tắt" })).toEqual({
      title: "Khoá A",
      subjectId: "s1",
      description: "tóm tắt",
    });
  });

  it("KHÔNG rò key FE (name/summary) ra wire", () => {
    const body = courseAdminBody({ name: "Khoá A", summary: "x" });
    expect(body).not.toHaveProperty("name");
    expect(body).not.toHaveProperty("summary");
  });

  it("field thiếu thì không mang key (PATCH bán phần, BE chỉ set field != null)", () => {
    expect(courseAdminBody({ name: "Khoá A" })).toEqual({ title: "Khoá A" });
  });
});

describe("useCreateCourse", () => {
  it("POST /courses với body đã map (title/description), KHÔNG mang saleMode (body BE không có)", async () => {
    admin.post.mockResolvedValue({ data: { id: "c1" } });
    const qc = createTestQueryClient();
    const h = renderHook(() => useCreateCourse(), qc);

    await act(async () => {
      await h.result.current.mutateAsync({
        subjectId: "s1",
        name: "Khoá A",
        summary: "tóm tắt",
        saleMode: "LEGACY",
      });
    });

    expect(admin.post).toHaveBeenCalledWith("/courses", {
      title: "Khoá A",
      subjectId: "s1",
      description: "tóm tắt",
    });
    h.unmount();
  });
});

describe("useUpdateCourse — saleMode + title/description qua core (owner-authz); subjectId qua admin", () => {
  it("saleMode + title/description đi CORE PATCH; không subjectId → KHÔNG admin PATCH", async () => {
    core.patch.mockResolvedValue({ data: { id: "c1" } });
    admin.patch.mockResolvedValue({ data: { id: "c1" } });
    const qc = createTestQueryClient();
    const h = renderHook(() => useUpdateCourse("c1"), qc);

    await act(async () => {
      await h.result.current.mutateAsync({ name: "Khoá A", summary: "mới", saleMode: "PACKAGE" });
    });

    expect(core.patch).toHaveBeenCalledWith("/courses/c1", { saleMode: "PACKAGE" });
    // title/description nay đi CORE (CatalogService.update owner-authz) — giảng viên sửa được khoá mình.
    expect(core.patch).toHaveBeenCalledWith("/courses/c1", { title: "Khoá A", description: "mới" });
    expect(admin.patch).not.toHaveBeenCalled();
    h.unmount();
  });

  it("subjectId đi ADMIN PATCH (core không nhận subjectId)", async () => {
    core.patch.mockResolvedValue({ data: { id: "c1" } });
    admin.patch.mockResolvedValue({ data: { id: "c1" } });
    const qc = createTestQueryClient();
    const h = renderHook(() => useUpdateCourse("c1"), qc);

    await act(async () => {
      await h.result.current.mutateAsync({ name: "Khoá A", subjectId: "sub-2" });
    });

    expect(core.patch).toHaveBeenCalledWith("/courses/c1", { title: "Khoá A" });
    expect(admin.patch).toHaveBeenCalledWith("/courses/c1", { subjectId: "sub-2" });
    h.unmount();
  });

  it("saleMode core COMMIT rồi title/desc core fail → VẪN invalidate detail+lists", async () => {
    core.patch.mockResolvedValueOnce({ data: {} }); // saleMode OK (đã commit)
    const err = new Error("500");
    core.patch.mockRejectedValueOnce(err); // title/desc fail
    const qc = createTestQueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const h = renderHook(() => useUpdateCourse("c1"), qc);

    await act(async () => {
      await expect(
        h.result.current.mutateAsync({ name: "Khoá A", saleMode: "PACKAGE" })
      ).rejects.toBe(err);
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: coursesKeys.detail("c1") });
    expect(spy).toHaveBeenCalledWith({ queryKey: coursesKeys.lists() });
    h.unmount();
  });

  it("không đổi type: title/desc qua core; core fail thì KHÔNG invalidate (chưa commit saleMode)", async () => {
    const err = new Error("500");
    core.patch.mockRejectedValue(err); // title/desc core fail
    const qc = createTestQueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const h = renderHook(() => useUpdateCourse("c1"), qc);

    await act(async () => {
      await expect(h.result.current.mutateAsync({ name: "Khoá A" })).rejects.toBe(err);
    });

    expect(admin.patch).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
    h.unmount();
  });
});

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

// admin-package-archived-readonly-and-sortorder — gói ARCHIVED chỉ đọc + sortOrder mặc định khi tạo.

function pkg(over: Partial<CoursePackage>): CoursePackage {
  return {
    id: "p1",
    name: "Gói",
    slug: "goi",
    status: "ACTIVE",
    entitlements: [],
    ...over,
  };
}

describe("nextPackageSortOrder", () => {
  it("khoá chưa có gói nào → 0", () => {
    expect(nextPackageSortOrder([])).toBe(0);
    expect(nextPackageSortOrder(undefined)).toBe(0);
  });

  it("max hiện có + 1", () => {
    expect(nextPackageSortOrder([pkg({ sortOrder: 0 }), pkg({ sortOrder: 2 })])).toBe(3);
  });

  it("sortOrder null/thiếu coi là 0 — không NaN", () => {
    expect(nextPackageSortOrder([pkg({ sortOrder: null }), pkg({})])).toBe(1);
  });
});

describe("isPackageArchived", () => {
  it("ARCHIVED → true, ACTIVE → false, undefined → false", () => {
    expect(isPackageArchived(pkg({ status: "ARCHIVED" }))).toBe(true);
    expect(isPackageArchived(pkg({ status: "ACTIVE" }))).toBe(false);
    expect(isPackageArchived(undefined)).toBe(false);
  });
});
