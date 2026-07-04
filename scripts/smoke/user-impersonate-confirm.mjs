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
  const page = await browser.newPage();

  await page.route("**/api/v1/admin/auth/refresh", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, message: "ok", data: { accessToken: "a", refreshToken: "r", expiresIn: 3600 } }) });
  });
  await page.route("**/api/v1/admin/auth/me", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, message: "ok", data: { user: { id: "1", email: "admin@x.vn", fullName: "Admin" }, permissions: ["dashboard.read", "user.view", "user.impersonate"], scopedGrants: [] } }) });
  });
  await page.route("**/api/v1/admin/users/u1", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, message: "ok", data: { id: "u1", fullName: "Test User", email: "test@x.vn", status: "active", roles: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }) });
  });
  await page.route("**/api/v1/admin/users/u1/impersonate", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, message: "ok", data: { token: "impersonation-token-xyz", expiresAt: new Date(Date.now() + 3600_000).toISOString() } }) });
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
  await page.goto("http://127.0.0.1:4173/users/u1", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  await page.click('button:has-text("Xem như user")');
  await page.waitForTimeout(300);

  const confirmText = await page.locator(".ant-modal-confirm-body").textContent();
  console.log("Confirm text:", confirmText);
  const hasReadOnly = confirmText?.includes("chỉ đọc");
  const hasAudit = confirmText?.includes("audit") || confirmText?.includes("ghi");

  await page.click('button:has-text("Bắt đầu xem")');
  await page.waitForTimeout(1000);

  const url = page.url();
  console.log("URL after confirm:", url);
  const navigated = url.includes("/users/u1/impersonate");

  await browser.close();
  preview.kill();

  if (!hasReadOnly || !hasAudit || !navigated) {
    console.error("IMPERSONATE CONFIRM TEST FAILED", { hasReadOnly, hasAudit, navigated });
    process.exit(1);
  }
  console.log("IMPERSONATE CONFIRM TEST PASSED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
