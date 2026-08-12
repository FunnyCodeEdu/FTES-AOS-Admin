import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { planPaperFolderZip } from "./paperFile";
import { zipPaperFolder } from "./paperFolderZip";

/** `File` giả lập tệp trong thư mục đã chọn: có nội dung thật + `webkitRelativePath`. */
function folderFile(path: string, content: string): File {
  const file = new File([content], path.split("/").pop() ?? path, { type: "text/plain" });
  Object.defineProperty(file, "webkitRelativePath", { value: path });
  return file;
}

describe("zipPaperFolder", () => {
  it("giữ NGUYÊN cấu trúc thư mục con bên trong archive", async () => {
    const plan = planPaperFolderZip([
      folderFile("de-pe/README.md", "# Đề PE"),
      folderFile("de-pe/src/Main.java", "class Main {}"),
      folderFile("de-pe/data/input1.txt", "1 2 3"),
      folderFile("de-pe/.DS_Store", "rác"),
    ]);

    const result = await zipPaperFolder(plan);

    expect(result.fileCount).toBe(3);
    expect(result.filename).toBe("de-pe.zip");
    expect(result.blob.size).toBeGreaterThan(0);

    const reopened = await JSZip.loadAsync(result.blob);
    // JSZip tự thêm cả entry THƯ MỤC ("de-pe/", "de-pe/src/") — đó là dấu hiệu cấu trúc còn nguyên;
    // đối chiếu phần tệp thật.
    const entries = Object.values(reopened.files)
      .filter((f) => !f.dir)
      .map((f) => f.name);
    expect(entries.sort()).toEqual([
      "de-pe/README.md",
      "de-pe/data/input1.txt",
      "de-pe/src/Main.java",
    ]);
    // Nội dung sống sót nguyên vẹn, kể cả tiếng Việt có dấu.
    await expect(reopened.file("de-pe/README.md")?.async("string")).resolves.toBe("# Đề PE");
    // Rác của hệ điều hành KHÔNG lọt vào archive.
    expect(reopened.file("de-pe/.DS_Store")).toBeNull();
  });

  it("báo tiến độ trong lúc nén và rơi về tên thử thách khi không có thư mục gốc", async () => {
    // Tệp chọn lẻ: `webkitRelativePath` rỗng ⇒ không suy ra được tên thư mục gốc.
    const plan = planPaperFolderZip([new File(["noi dung"], "de.txt", { type: "text/plain" })]);
    const seen: number[] = [];

    const result = await zipPaperFolder(plan, {
      fallbackName: "Bài thi cuối kỳ",
      onProgress: (percent) => seen.push(percent),
    });

    expect(result.filename).toBe("Bai_thi_cuoi_ky.zip");
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[seen.length - 1]).toBe(100);
  });
});
