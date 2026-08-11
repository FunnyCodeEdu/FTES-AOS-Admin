import { describe, expect, it } from "vitest";
import { readTestCaseList } from "../api/exercises.api";
import {
  buildTestCaseItems,
  describeTestCaseCount,
  DEFAULT_TEST_CASE_MEMORY_LIMIT_MB,
  DEFAULT_TEST_CASE_TIME_LIMIT_MS,
  emptyTestCaseRow,
  TEST_CASE_MAX_COUNT,
  testCaseViewsToRows,
  utf8ByteLength,
} from "./TestCaseEditor";

// challenge-testcase-editor §6.1 — hàm thuần của trình soạn test case.

describe("buildTestCaseItems", () => {
  it("§1.1 GIỮ NGUYÊN nội dung nhiều dòng của input/expected (không trim, không nuốt \\n)", () => {
    const items = buildTestCaseItems([
      {
        name: "T1",
        input: "3\n1 2 3\n",
        expectedOutput: "  6\nOK\n",
        hidden: false,
      },
    ]);
    expect(items[0].input).toBe("3\n1 2 3\n");
    expect(items[0].expectedOutput).toBe("  6\nOK\n");
  });

  it("§1.2 giới hạn LẤY TỪ FORM (không còn hardcode 2000/256)", () => {
    const items = buildTestCaseItems([
      {
        name: "Bài nặng",
        input: "1",
        expectedOutput: "1",
        weight: 3,
        hidden: true,
        timeLimitMs: 8000,
        memoryLimitMb: 512,
      },
    ]);
    expect(items[0]).toEqual({
      name: "Bài nặng",
      input: "1",
      expectedOutput: "1",
      weight: 3,
      hidden: true,
      timeLimitMs: 8000,
      memoryLimitMb: 512,
      orderNo: 0,
    });
  });

  it("§1.2 ô giới hạn trống / không hợp lệ → rơi về default; weight trống → 1", () => {
    const items = buildTestCaseItems([
      { name: "T1", input: "", expectedOutput: "", hidden: false },
      {
        name: "T2",
        input: "",
        expectedOutput: "",
        hidden: false,
        weight: 0,
        timeLimitMs: 0,
        memoryLimitMb: -5,
      },
    ]);
    for (const item of items) {
      expect(item.timeLimitMs).toBe(DEFAULT_TEST_CASE_TIME_LIMIT_MS);
      expect(item.memoryLimitMb).toBe(DEFAULT_TEST_CASE_MEMORY_LIMIT_MB);
      expect(item.weight).toBe(1);
    }
  });

  it("orderNo theo thứ tự hàng (sắp xếp lên/xuống đổi đúng orderNo)", () => {
    const items = buildTestCaseItems([
      { name: "B", input: "", expectedOutput: "", hidden: false },
      { name: "A", input: "", expectedOutput: "", hidden: false },
    ]);
    expect(items.map((i) => [i.name, i.orderNo])).toEqual([
      ["B", 0],
      ["A", 1],
    ]);
  });
});

describe("testCaseViewsToRows (đọc lại test case đã lưu)", () => {
  it("sắp theo orderNo dù BE trả lộn xộn", () => {
    const rows = testCaseViewsToRows([
      { name: "hai", orderNo: 1, input: "b", expectedOutput: "B" },
      { name: "một", orderNo: 0, input: "a", expectedOutput: "A" },
    ]);
    expect(rows.map((r) => r.name)).toEqual(["một", "hai"]);
  });

  it("vá default cho field vắng; nhận cả alias isHidden; hidden mặc định TRUE", () => {
    const [row] = testCaseViewsToRows([{ id: "tc-1", isHidden: false }]);
    expect(row).toEqual({
      name: "Test 1",
      input: "",
      expectedOutput: "",
      weight: 1,
      hidden: false,
      timeLimitMs: DEFAULT_TEST_CASE_TIME_LIMIT_MS,
      memoryLimitMb: DEFAULT_TEST_CASE_MEMORY_LIMIT_MB,
    });
    expect(testCaseViewsToRows([{ id: "tc-2" }])[0].hidden).toBe(true);
  });

  it("round-trip GET → rows → PUT items giữ nguyên giới hạn per-case", () => {
    const items = buildTestCaseItems(
      testCaseViewsToRows([
        {
          name: "T1",
          input: "1\n2",
          expectedOutput: "3",
          weight: 2,
          hidden: true,
          timeLimitMs: 5000,
          memoryLimitMb: 1024,
          orderNo: 0,
        },
      ])
    );
    expect(items[0]).toEqual({
      name: "T1",
      input: "1\n2",
      expectedOutput: "3",
      weight: 2,
      hidden: true,
      timeLimitMs: 5000,
      memoryLimitMb: 1024,
      orderNo: 0,
    });
  });

  it("danh sách rỗng / undefined → mảng rỗng", () => {
    expect(testCaseViewsToRows([])).toEqual([]);
    expect(testCaseViewsToRows(undefined)).toEqual([]);
  });
});

describe("readTestCaseList (chuẩn hoá payload GET)", () => {
  it("nhận mảng thuần và cả bọc {testCases}", () => {
    expect(readTestCaseList([{ name: "T1" }])).toEqual([{ name: "T1" }]);
    expect(readTestCaseList({ testCases: [{ name: "T2" }] })).toEqual([{ name: "T2" }]);
  });

  it("payload rỗng / lạ → mảng rỗng (không ném, trình soạn vẫn mở được)", () => {
    expect(readTestCaseList(null)).toEqual([]);
    expect(readTestCaseList(undefined)).toEqual([]);
    expect(readTestCaseList("oops")).toEqual([]);
    expect(readTestCaseList({ items: [] })).toEqual([]);
  });
});

describe("describeTestCaseCount (cảnh báo cap 200)", () => {
  it("dưới ngưỡng → ok, sát cap → near, vượt cap → over kèm số phải xoá", () => {
    expect(describeTestCaseCount(3).status).toBe("ok");
    expect(describeTestCaseCount(TEST_CASE_MAX_COUNT - 1).status).toBe("near");
    expect(describeTestCaseCount(TEST_CASE_MAX_COUNT).status).toBe("near");
    const over = describeTestCaseCount(TEST_CASE_MAX_COUNT + 5);
    expect(over.status).toBe("over");
    expect(over.text).toContain("5");
  });
});

describe("tiện ích", () => {
  it("utf8ByteLength đếm BYTE (dấu tiếng Việt > 1 byte), không phải code unit", () => {
    expect(utf8ByteLength("abc")).toBe(3);
    expect(utf8ByteLength("é")).toBe(2);
    expect(utf8ByteLength(undefined)).toBe(0);
  });

  it("emptyTestCaseRow đánh số từ 1 và mang default giới hạn", () => {
    expect(emptyTestCaseRow(0)).toEqual({
      name: "Test 1",
      input: "",
      expectedOutput: "",
      weight: 1,
      hidden: false,
      timeLimitMs: DEFAULT_TEST_CASE_TIME_LIMIT_MS,
      memoryLimitMb: DEFAULT_TEST_CASE_MEMORY_LIMIT_MB,
    });
  });
});
