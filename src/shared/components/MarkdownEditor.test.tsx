import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { MarkdownEditor } from "./MarkdownEditor";
import editorCss from "./MarkdownEditor.css?raw";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
let styles: HTMLStyleElement;
let modalLock: HTMLStyleElement;
let originalBodyStyle: string | null;

beforeEach(() => {
  originalBodyStyle = document.body.getAttribute("style");
  document.body.style.backgroundColor = "rgb(245, 245, 245)";
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  styles = document.createElement("style");
  styles.textContent = editorCss;
  document.head.appendChild(styles);
  modalLock = document.createElement("style");
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  styles.remove();
  modalLock.remove();
  if (originalBodyStyle === null) document.body.removeAttribute("style");
  else document.body.setAttribute("style", originalBodyStyle);
});

async function mountEditor() {
  await act(async () => root.render(<MarkdownEditor value="Test challenge" uploadImage={async () => ""} />));
}

async function toggleFullscreen() {
  const button = host.querySelector<HTMLButtonElement>('button[data-name="fullscreen"]');
  expect(button).not.toBeNull();
  await act(async () => button!.click());
}

function lockModal() {
  // Match the browser's computed shorthand from an Ant Design overflow-y lock.
  // jsdom does not derive this shorthand from overflow-y alone.
  modalLock.textContent = "html body { overflow: auto hidden; }";
  document.head.appendChild(modalLock);
}

it("does not retain a dialog's scroll lock after closing and navigating away", async () => {
  lockModal();
  await mountEditor();
  expect(getComputedStyle(document.body).overflow).toBe("auto hidden");
  expect(document.body.style.overflow).toBe("");
  await act(async () => root.render(<main>Next page</main>));
  modalLock.remove();
  expect(document.body.style.overflow).toBe("");
  expect(getComputedStyle(document.body).overflow).not.toContain("hidden");
  expect(document.body.style.backgroundColor).toBe("rgb(245, 245, 245)");
});

it("locks fullscreen and unlocks when fullscreen exits", async () => {
  await mountEditor();
  await toggleFullscreen();
  expect(getComputedStyle(document.body).overflow).toBe("hidden");
  expect(document.body.style.overflow).toBe("");
  await toggleFullscreen();
  expect(getComputedStyle(document.body).overflow).not.toContain("hidden");
});

it("releases fullscreen scrolling when the editor unmounts during navigation", async () => {
  await mountEditor();
  await toggleFullscreen();
  expect(getComputedStyle(document.body).overflow).toBe("hidden");
  await act(async () => root.render(<main>Next page</main>));
  expect(getComputedStyle(document.body).overflow).not.toContain("hidden");
  expect(document.body.style.overflow).toBe("");
});

it("keeps an enclosing dialog locked after exiting fullscreen until the dialog closes", async () => {
  lockModal();
  await mountEditor();
  await toggleFullscreen();
  await toggleFullscreen();
  expect(getComputedStyle(document.body).overflow).toContain("hidden");
  expect(document.body.style.overflow).toBe("");
  await act(async () => root.render(null));
  modalLock.remove();
  expect(getComputedStyle(document.body).overflow).not.toContain("hidden");
});
