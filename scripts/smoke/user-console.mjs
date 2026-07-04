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

async function runScenario({ hasUserView, label }) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();

  const perms = ["dashboard.read"];
  if (hasUserView) perms.push("user.view");

  await page.route("**/api/v1/admin/auth/refresh", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, message: "ok", data: { accessToken: "a", refreshToken: "r", expiresIn: 3600 } }) });
  });
  await page.route("**/api/v1/admin/auth/me", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, message: "ok", data: { user: { id: "1", email: "admin@x.vn", fullName: "Admin" }, permissions: perms, scopedGrants: [] } }) });
  });
  await page.route("**/api/v1/admin/users**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, message: "ok", data: { items: [{ id: "u1", fullName: "Test User", email: "test@x.vn", roleNames: ["Học viên"], status: "active", campus: "HN", createdAt: new Date().toISOString() }], total: 1 } }) });
  });
  await page.route("**/api/v1/admin/rbac/roles**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, message: "ok", data: { items: [], total: 0 } }) });
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
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Expand Hệ thống group if collapsed
  const systemGroup = page.locator('.ant-menu-submenu-title:has-text("Hệ thống")');
  if ((await systemGroup.count()) > 0 && !(await systemGroup.evaluate((el) => el.parentElement?.classList.contains('ant-menu-submenu-open')))) {
    await systemGroup.click();
    await page.waitForTimeout(300);
  }
  const hasNav = await page.locator('.ant-menu-item:has-text("Người dùng")').count() > 0;
  await page.goto("http://127.0.0.1:4173/users", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const url = page.url();
  const is403 = url.includes("/403");
  const hasTable = (await page.locator(".ant-table").count()) > 0;

  await browser.close();

  console.log(`Scenario ${label}: nav=${hasNav}, table=${hasTable}, 403=${is403}`);
  if (hasUserView) {
    return hasNav && hasTable && !is403;
  }
  return !hasNav && is403 && !hasTable;
}

async function main() {
  const preview = await startPreview();
  if (!(await healthCheck())) {
    preview.kill();
    process.exit(1);
  }

  const ok1 = await runScenario({ hasUserView: true, label: "with-user.view" });
  const ok2 = await runScenario({ hasUserView: false, label: "without-user.view" });

  preview.kill();

  if (!ok1 || !ok2) {
    console.error("SMOKE TEST FAILED");
    process.exit(1);
  }
  console.log("SMOKE TEST PASSED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
