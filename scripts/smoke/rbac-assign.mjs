import { spawn } from "child_process";
import { chromium } from "playwright";
import http from "http";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function startPreview() {
  return new Promise((resolve, reject) => {
    const proc = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4173"], {
      cwd: process.cwd(),
      shell: true,
      stdio: "ignore",
    });
    proc.on("error", reject);
    setTimeout(() => resolve(proc), 5000);
  });
}

async function healthCheck() {
  return new Promise((resolve) => {
    http
      .get("http://127.0.0.1:4173/", (res) => resolve(res.statusCode === 200))
      .on("error", () => resolve(false));
  });
}

async function main() {
  const preview = await startPreview();
  if (!(await healthCheck())) {
    preview.kill();
    process.exit(1);
  }

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  let assignRequestBody = null;

  await page.route("**/api/v1/admin/auth/refresh", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, message: "ok", data: { accessToken: "a", refreshToken: "r", expiresIn: 3600 } }) });
  });
  await page.route("**/api/v1/admin/auth/me", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, message: "ok", data: { user: { id: "1", email: "admin@x.vn", fullName: "Admin" }, permissions: ["dashboard.read", "rbac.assignment.manage", "rbac.grant.manage"], scopedGrants: [] } }) });
  });
  await page.route("**/api/v1/admin/rbac/users/abc/access", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, message: "ok", data: { user: { id: "abc", email: "target@x.vn", fullName: "Target User" }, roles: [], grants: [] } }) });
  });
  await page.route("**/api/v1/admin/rbac/users/abc/audit**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, message: "ok", data: { items: [], total: 0 } }) });
  });
  await page.route("**/api/v1/admin/rbac/permissions**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, message: "ok", data: { domains: [] } }) });
  });
  await page.route("**/api/v1/admin/rbac/roles**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, message: "ok", data: { items: [{ id: "preset-academic", name: "Admin Academic", description: "", isPreset: true, presetDomain: "academic", permissionCount: 3, userCount: 0, updatedAt: new Date().toISOString(), permissions: ["course.read", "course.publish", "user.lock"] }], total: 1 } }) });
  });
  await page.route("**/api/v1/admin/rbac/users/abc/roles", async (route) => {
    const req = route.request();
    if (req.method() === "POST") assignRequestBody = JSON.parse(req.postData() || "{}");
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, message: "ok", data: { user: { id: "abc", email: "target@x.vn", fullName: "Target User" }, roles: [{ roleId: "preset-academic", name: "Admin Academic", assignedAt: new Date().toISOString(), assignedBy: "admin" }], grants: [] } }) });
  });
  await page.route("**/api/v1/admin/notifications**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, message: "ok", data: { items: [], total: 0 } }) });
  });
  await page.route("**/api/v1/admin/tasks**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, message: "ok", data: { items: [], total: 0 } }) });
  });

  await page.goto("http://127.0.0.1:4173/login");
  await page.evaluate(() => {
    localStorage.setItem("ftes-admin-remember", "1");
    localStorage.setItem("ftes-admin-refresh", "stored-refresh-token");
  });
  await page.goto("http://127.0.0.1:4173/system/rbac/users/abc", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  await page.click('button:has-text("Gán vai trò")');
  await page.waitForTimeout(800);

  await page.click('.ant-tabs-tab:has-text("Preset admin mảng")');
  await page.waitForTimeout(600);

  await page.locator('.ant-radio-wrapper:has-text("Admin Academic")').first().click();
  await page.waitForTimeout(600);

  const inputs = await page.evaluate(() => Array.from(document.querySelectorAll('input[name="roleId"]')).map((i) => i.value));
  console.log("input values before next:", inputs);

  await page.click('button:has-text("Tiếp theo")');
  await page.waitForTimeout(600);

  const modalText = await page.locator(".ant-modal-body").textContent();
  console.log("Confirm modal text:", modalText);

  const hasPermissionCount = modalText?.includes("3");
  const hasPermissions = modalText?.includes("course.read") && modalText?.includes("user.lock");
  const hasDangerous = modalText?.includes("nguy hiểm") || modalText?.includes("user.lock");

  console.log("Has permission count:", hasPermissionCount);
  console.log("Has permissions listed:", hasPermissions);
  console.log("Has dangerous warning:", hasDangerous);

  await page.click('button:has-text("Xác nhận gán")');
  await page.waitForTimeout(1000);

  console.log("Assign request body:", assignRequestBody);
  const assignOk = assignRequestBody?.roleId === "preset-academic";
  console.log("Assign roleId correct:", assignOk);

  await page.screenshot({ path: "tmp-rbac-assign-smoke-final.png", fullPage: true });

  await browser.close();
  preview.kill();

  if (!hasPermissionCount || !hasPermissions || !hasDangerous || !assignOk) {
    console.error("SMOKE TEST FAILED");
    process.exit(1);
  }
  console.log("SMOKE TEST PASSED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
