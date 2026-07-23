// E2E admin-lecturer-ai-assist — account LECTURER instructor.test@ftes.vn trên apitest.
// Dev server 5173 phải chạy sẵn. Login programmatic: POST /auth/login → set localStorage
// ftes-admin-refresh + ftes-admin-remember=1 (addInitScript) → App.tsx tự POST /refresh.
//
// LƯU Ý phạm vi: LECTURER có ai.teacher.use nhưng KHÔNG có admin.subject.read /
// admin.course.read → route /academic/quiz-bank và /academic/courses/:id/lessons/:id bị
// PermissionRoute chặn 403 → kịch bản A (sinh đề→quiz), B (độ khó), D (SSE soạn lesson)
// BLOCKED ở tầng UI cho role này (BE đã verify riêng qua API: exam-generate job COMPLETED,
// SSE LESSON_SUGGESTION stream delta/done OK). Test dưới GHI NHẬN đúng thực trạng gate.

import { test, expect, type Page } from "@playwright/test";

const API = "https://apitest.ftes.vn/api/v1";
const LECTURER = { identifier: "instructor.test@ftes.vn", password: "Ftes@Test2026" };

// Course/lesson thuộc sở hữu instructor.test (GET /courses/teaching 2026-07-23).
const OWNED_COURSE_ID = "a236b053-8bff-4cc7-be90-a380928720bd"; // E2EIF965242 (0 lesson)
const OWNED_LESSON_ID = "283d2219-5be6-4c98-a0a2-2e206cca7fdc"; // DOCUMENT, course slice3-refund-1783558072
const OWNED_LESSON_COURSE_ID = "44268da3-2c01-42ca-9b43-dc3ef452d909";

test.describe.configure({ mode: "serial" });

async function loginAndBoot(page: Page, path: string) {
  // Login MỖI test để lấy refresh token tươi (tránh rủi ro rotation làm token cũ chết).
  const resp = await page.request.post(`${API}/auth/login`, { data: LECTURER });
  expect(resp.ok()).toBeTruthy();
  const body = await resp.json();
  const refreshToken: string = body?.data?.refreshToken;
  expect(refreshToken, "login phải trả refreshToken").toBeTruthy();

  await page.addInitScript(
    ([rt]) => {
      localStorage.setItem("ftes-admin-refresh", rt);
      localStorage.setItem("ftes-admin-remember", "1");
    },
    [refreshToken],
  );
  await page.goto(path);
}

test("gate: nav hiện 'Trợ lý AI', route /academic/ai-assist vào được", async ({ page }) => {
  await loginAndBoot(page, "/academic/ai-assist");

  await expect(page.getByRole("heading", { level: 3, name: /Trợ lý AI/ })).toBeVisible({
    timeout: 30_000,
  });
  // 3 tab đúng thứ tự thiết kế
  await expect(page.getByRole("tab", { name: "Tóm tắt học viên" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Nháp nhận xét" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Phân tích lớp" })).toBeVisible();
  // Nav side: mở group "Học thuật" (submenu antd chỉ mount con khi expand)
  await page.getByRole("menuitem", { name: "Học thuật" }).click();
  await expect(page.locator(".ant-menu").getByText("Trợ lý AI")).toBeVisible();
  // Sau fix 13a0f94 (OR-widen ai.teacher.use): Quiz bank HIỆN trong nav cho LECTURER
  await expect(page.locator(".ant-menu").getByText("Quiz bank")).toBeVisible();
});

// LƯU Ý 2026-07-23: cả 3 endpoint /ai/mentor/* trên apitest đang trả 502 Bad Gateway
// (Cloudflare, xác nhận 4 lần qua curl — các endpoint /ai khác vẫn sống). Test dưới ghi nhận
// TERMINAL STATE của UI: markdown (happy) HOẶC alert lỗi (UI phòng thủ khi BE outage).
// Kết quả in ra console để tổng hợp verdict: "MENTOR_<tab>: RESULT|ERROR_ALERT".
async function submitAndRecord(page: Page, tag: string, extraOnResult?: () => Promise<void>) {
  const terminal = page.locator(".wmde-markdown, .ant-alert-error").first();
  await expect(terminal, "UI phải đạt trạng thái kết thúc (kết quả hoặc alert lỗi)").toBeVisible({
    timeout: 150_000,
  });
  const gotResult = await page.locator(".wmde-markdown").count();
  if (gotResult > 0) {
    console.log(`${tag}: RESULT`);
    if (extraOnResult) await extraOnResult();
  } else {
    const msg = await page.locator(".ant-alert-error").first().innerText();
    console.log(`${tag}: ERROR_ALERT — ${msg.replace(/\n/g, " ")}`);
  }
}

test("mentor tab 1 — student brief: submit → terminal state", async ({ page }) => {
  await loginAndBoot(page, "/academic/ai-assist");
  await expect(page.getByRole("tab", { name: "Tóm tắt học viên" })).toBeVisible({ timeout: 30_000 });

  await page.getByLabel("Alias học viên").fill("HV-042");
  await page
    .getByLabel("Tín hiệu / dữ kiện")
    .fill("- Điểm quiz gần nhất: 4/10\n- Vắng 2 buổi liên tiếp\n- Chưa nộp bài tập tuần 3");
  await page.getByRole("button", { name: "Tạo tóm tắt" }).click();
  await submitAndRecord(page, "MENTOR_STUDENT_BRIEF");
});

test("mentor tab 2 — feedback assist: submit → terminal state (copy-only khi có kết quả)", async ({
  page,
}) => {
  await loginAndBoot(page, "/academic/ai-assist");
  await page.getByRole("tab", { name: "Nháp nhận xét" }).click();

  await page
    .getByLabel("Nội dung bài nộp / ngữ cảnh")
    .fill(
      "Bài nộp: hàm tính tổng mảng trong Java dùng vòng for, có xử lý mảng rỗng, chưa có unit test.",
    );
  // rubric text tự do: từng 502 (BE pass-through sai contract ai-service) — đã sửa BE 06ad722
  // (coerce string → RubricItem), retest live 200. Điền lại để đi đúng đường người dùng.
  await page.getByLabel("Rubric / tiêu chí (tuỳ chọn)").fill("Đúng yêu cầu, code sạch, có test");
  await page.getByRole("button", { name: "Tạo nháp nhận xét" }).click();
  await submitAndRecord(page, "MENTOR_FEEDBACK_ASSIST", async () => {
    // Mentor-in-the-loop: có nút copy, có ghi chú KHÔNG tự gửi
    await expect(page.getByRole("button", { name: "Sao chép nháp" })).toBeVisible();
    await expect(page.getByText(/Hệ thống KHÔNG tự\s*gửi/)).toBeVisible();
  });
});

test("mentor tab 3 — cohort insight: submit → terminal state", async ({ page }) => {
  await loginAndBoot(page, "/academic/ai-assist");
  await page.getByRole("tab", { name: "Phân tích lớp" }).click();

  await page.getByLabel("Mô tả nhóm / lớp").fill("Lớp Java K18 — 32 học viên, tuần 5/12");
  await page
    .getByLabel("Số liệu")
    .fill("- Hoàn thành bài tập: 68%\n- Điểm TB quiz: 7.2\n- 5 học viên rủi ro bỏ học");
  await page.getByRole("button", { name: "Phân tích lớp" }).click();
  await submitAndRecord(page, "MENTOR_COHORT_INSIGHT");
});

// Sau fix 13a0f94 (routeRegistry OR-widen ai.teacher.use): LECTURER VÀO ĐƯỢC 2 route
// từng BLOCKED-ROLE-GATE ở wave-3. Ghi nhận thêm trạng thái data-level (REST admin.* có thể
// vẫn 403 cho LECTURER — route mở là scope của fix, data-403 hiển thị phòng thủ).
test("S1/S2 UNBLOCKED: /academic/quiz-bank vào được, nút Sinh đề AI hiện (ai.teacher.use)", async ({
  page,
}) => {
  await loginAndBoot(page, "/academic/quiz-bank");
  await expect(page).not.toHaveURL(/\/403/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 3, name: "Quiz bank" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("button", { name: /Sinh câu hỏi bằng AI/ })).toBeVisible();
  // Ghi nhận data-level: bảng quiz có lỗi 403 hay render (không assert cứng — ngoài scope fix route)
  const err = await page.locator(".ant-alert-error, .ant-message-error").count();
  console.log(`QUIZ_BANK_DATA: ${err > 0 ? "ERROR_SHOWN" : "NO_ERROR"}`);
});

test("S4 UNBLOCKED: lesson editor vào được, nút Trợ lý AI hiện (ai.teacher.use)", async ({
  page,
}) => {
  await loginAndBoot(
    page,
    `/academic/courses/${OWNED_LESSON_COURSE_ID}/lessons/${OWNED_LESSON_ID}`,
  );
  await expect(page).not.toHaveURL(/\/403/, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: /Trợ lý AI/ })).toBeVisible({ timeout: 30_000 });
});

// Task 5.6 (rút gọn an toàn): sinh dàn ý qua SSE LESSON_SUGGESTION → chèn vào editor. DỪNG ở
// chèn (state local, không auto-save) — không bấm Lưu để khỏi ghi đè content lesson test dùng
// chung; đường ghi owner đã chứng minh riêng (PUT upsertContent + fix BE 0bae7ea đọc/ghi đối xứng).
test("S4 flow: sinh dàn ý SSE → output stream → chèn tại con trỏ đổi body editor", async ({
  page,
}) => {
  await loginAndBoot(
    page,
    `/academic/courses/${OWNED_LESSON_COURSE_ID}/lessons/${OWNED_LESSON_ID}`,
  );
  await page.getByRole("button", { name: /Trợ lý AI/ }).click();
  // Textarea body là cái duy nhất style monospace (panel có ô prompt riêng + antd sinh textarea
  // đo autosize ẩn → không dùng first/last).
  const editor = page.locator('textarea[style*="monospace"]');
  await expect(editor).toBeVisible({ timeout: 30_000 });
  await editor.click(); // đặt caret để snapshot selection có vị trí chèn
  const before = await editor.inputValue();

  await page.getByRole("button", { name: "Sinh dàn ý" }).click();
  // Chờ stream kết thúc: nút "Chèn tại con trỏ" enable khi hasResult && !streaming
  const insertBtn = page.getByRole("button", { name: "Chèn tại con trỏ" });
  await expect(insertBtn).toBeEnabled({ timeout: 120_000 });
  await insertBtn.click();
  const after = await editor.inputValue();
  expect(after.length).toBeGreaterThan(before.length);
  console.log(`S4_FLOW: inserted ${after.length - before.length} chars`);

  // Hoàn tác chèn (1 mức) → body về đúng snapshot trước chèn
  await page.getByRole("button", { name: "Hoàn tác chèn" }).click();
  expect(await editor.inputValue()).toBe(before);

  // Bôi đen đoạn đầu → "Cải thiện" → "Thay đoạn bôi đen" → body đổi nhưng giữ phần đuôi
  await editor.click();
  await editor.evaluate((el) => {
    const ta = el as HTMLTextAreaElement;
    ta.focus();
    ta.setSelectionRange(0, Math.min(20, ta.value.length));
  });
  await page.getByRole("button", { name: "Cải thiện" }).click();
  const replaceBtn = page.getByRole("button", { name: "Thay đoạn bôi đen" });
  await expect(replaceBtn).toBeEnabled({ timeout: 120_000 });
  await replaceBtn.click();
  const replaced = await editor.inputValue();
  expect(replaced).not.toBe(before);
  console.log(`S4_FLOW: replaced selection, body ${before.length} -> ${replaced.length} chars`);
  // KHÔNG bấm Lưu: tránh ghi đè content lesson test dùng chung; đường ghi owner đã chứng minh
  // riêng (PUT upsertContent + BE 0bae7ea đọc/ghi đối xứng).
});
