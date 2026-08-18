import { useEffect, useRef } from "react";

interface GisCredentialResponse {
  credential?: string;
}

interface GisAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (resp: GisCredentialResponse) => void;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: { id: GisAccountsId };
    };
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";

/**
 * Nạp script Google Identity Services đúng một lần và resolve khi `window.google.accounts.id` sẵn sàng.
 * Bị chặn / offline → reject; nút không hiện, luồng email/password vẫn dùng bình thường.
 */
function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`
    );
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("GIS load failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("GIS load failed"));
    document.head.appendChild(script);
  });
}

interface GoogleSignInButtonProps {
  clientId: string;
  /** Nhận id_token (credential) khi user đăng nhập Google thành công. */
  onCredential: (idToken: string) => void;
}

/**
 * Render nút "Sign in with Google" chính chủ của GIS. Khi user chọn tài khoản, GIS gọi callback với
 * id_token → đẩy lên `onCredential` để feature đổi lấy TokenResponse của BE.
 */
export default function GoogleSignInButton({
  clientId,
  onCredential,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Giữ callback mới nhất mà không phải re-init GIS mỗi lần cha re-render.
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    let cancelled = false;
    loadGisScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const gisId = window.google?.accounts.id;
        if (!gisId) return;
        gisId.initialize({
          client_id: clientId,
          callback: (resp) => {
            if (resp.credential) callbackRef.current(resp.credential);
          },
        });
        containerRef.current.innerHTML = "";
        gisId.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          logo_alignment: "left",
          width: 320,
        });
      })
      .catch(() => {
        /* GIS bị chặn/offline: bỏ qua, email/password vẫn hoạt động */
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <div
      ref={containerRef}
      style={{ display: "flex", justifyContent: "center", minHeight: 40 }}
    />
  );
}
