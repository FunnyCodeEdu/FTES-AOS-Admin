import { App } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore, type User as MeUser } from "./store";
import { ME_QUERY_KEY, fetchMe } from "./api";

/**
 * Hoàn tất phiên sau khi đã có token (đăng nhập mật khẩu, xác thực 2FA, hoặc social login):
 * lưu token → nạp lại `me` (permissions/scopedGrants) → set session → điều hướng tới `redirectTarget`.
 *
 * Token hợp lệ là ĐỦ để vào: `me` hỏng cũng vẫn điều hướng (xem lý do ở thân hàm).
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
  const queryClient = useQueryClient();

  return async (
    tokens: { accessToken: string; refreshToken: string },
    rememberMe: boolean,
    redirectTarget: string
  ): Promise<boolean> => {
    setTokens(tokens.accessToken, tokens.refreshToken);
    // Nạp `me` bằng fetchQuery + fetchMe (KHÔNG dùng refetch của useMe): hook đó bị gác
    // `enabled: accessToken !== null`, mà ngay tại tick này observer vẫn đang disabled (store vừa set,
    // component chưa re-render) nên `refetch()` là no-op → data rỗng → không điều hướng → người dùng
    // phải bấm đăng nhập LẦN HAI mới vào được.
    let data: Awaited<ReturnType<typeof fetchMe>> | undefined;
    // Thử hai lần: `me` gọi song song GraphQL + REST, một cú chập mạng/BE vừa nguội là hỏng cả cụm.
    for (let attempt = 0; attempt < 2 && !data; attempt++) {
      try {
        data = await queryClient.fetchQuery({
          queryKey: ME_QUERY_KEY,
          queryFn: fetchMe,
          staleTime: 0,
        });
      } catch {
        data = undefined;
      }
    }

    // KHÔNG lấy được `me` vẫn ĐI TIẾP. Token đã hợp lệ — đây mới là chỗ sinh ra "phải đăng nhập hai
    // lần": bản cũ đứng lại ở form đăng nhập, mà lần bấm thứ hai thành công chỉ vì lần hỏng kia là
    // hỏng nhất thời. Vào trong rồi thì `PermissionRoute`/`NavMenu` tự gọi `useMe` (có retry riêng,
    // có nút thử lại) — không màn hình nào đọc quyền từ store nên phiên thiếu `me` không lệch quyền.
    setSession(
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: data?.user ?? ({ id: "", email: "", fullName: "" } as MeUser),
        permissions: data?.permissions ?? [],
        scopedGrants: data?.scopedGrants ?? [],
      },
      rememberMe
    );
    if (!data) {
      notification.warning({
        message: "Đã đăng nhập, đang tải lại thông tin tài khoản",
      });
    }
    navigate(redirectTarget, { replace: true });
    return true;
  };
}
