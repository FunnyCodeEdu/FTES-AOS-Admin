import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Result, Spin, Typography } from "antd";
import { useGithubLogin } from "./api";
import { useFinishSession } from "./useFinishSession";

/**
 * Callback GitHub OAuth: đọc `?code` → đổi lấy TokenResponse của BE → lưu token + chạy cổng quyền
 * (qua useFinishSession, y hệt đăng nhập mật khẩu). Route này để layout "none" nên render đứng riêng,
 * không nằm trong AdminLayout/PermissionRoute.
 */
export default function GithubCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const githubLogin = useGithubLogin();
  const finishSession = useFinishSession();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Chặn double-exchange (StrictMode gọi effect 2 lần) — code OAuth chỉ dùng được một lần.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const code = searchParams.get("code");
    const oauthError = searchParams.get("error");

    if (oauthError) {
      setErrorMsg("GitHub đã từ chối yêu cầu đăng nhập.");
      return;
    }
    if (!code) {
      setErrorMsg("Thiếu mã uỷ quyền từ GitHub.");
      return;
    }

    githubLogin.mutate(
      { code },
      {
        onSuccess: (res) => {
          if (res.twoFactorRequired && res.twoFactorToken) {
            // Tài khoản bật 2FA: quay về trang đăng nhập để tiếp tục bước nhập OTP.
            navigate("/login", {
              replace: true,
              state: { twoFactorToken: res.twoFactorToken },
            });
          } else if (res.accessToken && res.refreshToken) {
            finishSession(
              { accessToken: res.accessToken, refreshToken: res.refreshToken },
              false,
              "/"
            );
          } else {
            setErrorMsg("Phản hồi đăng nhập không hợp lệ.");
          }
        },
        onError: (err) => setErrorMsg(err.message),
      }
    );
  }, [searchParams, githubLogin, finishSession, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f5",
        padding: 16,
      }}
    >
      <Card style={{ width: 380, maxWidth: "100%" }}>
        {errorMsg ? (
          <Result
            status="error"
            title="Đăng nhập GitHub thất bại"
            subTitle={errorMsg}
            extra={
              <Button
                type="primary"
                onClick={() => navigate("/login", { replace: true })}
              >
                Quay lại đăng nhập
              </Button>
            }
          />
        ) : (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin size="large" />
            <Typography.Paragraph style={{ marginTop: 16 }}>
              Đang hoàn tất đăng nhập với GitHub...
            </Typography.Paragraph>
          </div>
        )}
      </Card>
    </div>
  );
}
