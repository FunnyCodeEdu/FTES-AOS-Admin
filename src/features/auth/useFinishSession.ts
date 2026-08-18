import { App } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "./store";
import { useMe } from "./api";

/**
 * Hoàn tất phiên sau khi đã có token (đăng nhập mật khẩu, xác thực 2FA, hoặc social login):
 * lưu token → nạp lại `me` (permissions/scopedGrants) → set session → điều hướng tới `redirectTarget`.
 *
 * Trả về false nếu không lấy được `me` (giữ nguyên hành vi cũ của LoginPage).
 *
 * QUAN TRỌNG: cổng quyền `PermissionRoute` VẪN chạy ở route đích. Tài khoản Google/GitHub không có
 * quyền admin sẽ bị đá về /403 (hoặc /login) y hệt đăng nhập mật khẩu — social login KHÔNG bỏ qua
 * bước kiểm quyền này, chỉ thay cách lấy token ban đầu.
 */
export function useFinishSession() {
  const { notification } = App.useApp();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const setTokens = useAuthStore((s) => s.setTokens);
  const { refetch: refetchMe } = useMe();

  return async (
    tokens: { accessToken: string; refreshToken: string },
    rememberMe: boolean,
    redirectTarget: string
  ): Promise<boolean> => {
    setTokens(tokens.accessToken, tokens.refreshToken);
    const { data } = await refetchMe();
    if (!data) {
      notification.error({ message: "Không thể lấy thông tin người dùng" });
      return false;
    }
    setSession(
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: data.user,
        permissions: data.permissions,
        scopedGrants: data.scopedGrants,
      },
      rememberMe
    );
    navigate(redirectTarget, { replace: true });
    return true;
  };
}
