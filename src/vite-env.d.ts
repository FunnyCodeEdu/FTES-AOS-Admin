/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL của FTES-AOS-Backend (KHÔNG có dấu / cuối). */
  readonly VITE_API_BASE_URL?: string;
  /** Google Identity Services OAuth client ID. Bỏ trống ⇒ ẩn nút đăng nhập Google. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** GitHub OAuth App client ID. Bỏ trống ⇒ ẩn nút đăng nhập GitHub. */
  readonly VITE_GITHUB_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
