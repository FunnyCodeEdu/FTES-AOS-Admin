import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  Spin,
  Typography,
  App,
} from "antd";
import { GithubOutlined } from "@ant-design/icons";
import { useLocation, useSearchParams } from "react-router-dom";
import { useLogin, useGoogleLogin, useVerify2FA } from "./api";
import type { LoginCredentials, Verify2FARequest } from "./api";
import { useFinishSession } from "./useFinishSession";
import GoogleSignInButton from "./GoogleSignInButton";

function isInternalUrl(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return url.startsWith("/") && !url.startsWith("//");
  }
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID ?? "";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { notification } = App.useApp();
  const [step, setStep] = useState<1 | 2>(1);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [remember, setRemember] = useState(false);
  const [loginForm] = Form.useForm<LoginCredentials>();
  const [otpForm] = Form.useForm<Verify2FARequest>();

  const login = useLogin();
  const verify2fa = useVerify2FA();
  const googleLogin = useGoogleLogin();
  const finishSession = useFinishSession();

  const returnUrl = searchParams.get("returnUrl") ?? "/";
  const redirectTarget = isInternalUrl(returnUrl) ? returnUrl : "/";

  // Social login (vd GitHub callback) có thể chuyển tới đây khi tài khoản bật 2FA — tiếp tục bước OTP.
  const initialTwoFactorToken = (
    location.state as { twoFactorToken?: string } | null
  )?.twoFactorToken;
  useEffect(() => {
    if (initialTwoFactorToken) {
      setTwoFactorToken(initialTwoFactorToken);
      setStep(2);
    }
  }, [initialTwoFactorToken]);

  const handleTokenResponse = (
    res: {
      twoFactorRequired: boolean;
      twoFactorToken?: string;
      accessToken?: string;
      refreshToken?: string;
    },
    rememberMe: boolean
  ) => {
    if (res.twoFactorRequired && res.twoFactorToken) {
      setRemember(rememberMe);
      setTwoFactorToken(res.twoFactorToken);
      setStep(2);
      otpForm.resetFields();
    } else if (res.accessToken && res.refreshToken) {
      finishSession(
        { accessToken: res.accessToken, refreshToken: res.refreshToken },
        rememberMe,
        redirectTarget
      );
    } else {
      notification.error({ message: "Phản hồi đăng nhập không hợp lệ" });
    }
  };

  const onLogin = (values: LoginCredentials) => {
    const rememberMe = values.remember ?? false;
    setRemember(rememberMe);
    login.mutate(values, {
      onSuccess: (res) => handleTokenResponse(res, rememberMe),
    });
  };

  const onGoogleCredential = (idToken: string) => {
    if (googleLogin.isPending) return;
    const rememberMe = loginForm.getFieldValue("remember") ?? false;
    googleLogin.mutate(
      { idToken },
      { onSuccess: (res) => handleTokenResponse(res, rememberMe) }
    );
  };

  const onGithubLogin = () => {
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: githubClientId,
      redirect_uri: redirectUri,
      scope: "read:user user:email",
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  };

  const onVerify = (values: Verify2FARequest) => {
    verify2fa.mutate(
      { twoFactorToken, otp: values.otp },
      {
        onSuccess: (res) => {
          finishSession(
            { accessToken: res.accessToken, refreshToken: res.refreshToken },
            remember,
            redirectTarget
          );
        },
      }
    );
  };

  const error = login.error || verify2fa.error || googleLogin.error;
  const socialEnabled = Boolean(googleClientId) || Boolean(githubClientId);

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
        <Typography.Title level={4} style={{ textAlign: "center" }}>
          FTES AOS Admin
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: "center" }}>
          {step === 1 ? "Đăng nhập bằng tài khoản admin" : "Nhập mã xác thực 2FA"}
        </Typography.Paragraph>

        {error && (
          <Typography.Paragraph type="danger" style={{ textAlign: "center" }}>
            {error.message}
          </Typography.Paragraph>
        )}

        {step === 1 ? (
          <>
            <Form
              form={loginForm}
              layout="vertical"
              onFinish={onLogin}
              autoComplete="off"
            >
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "Vui lòng nhập email" },
                  { type: "email", message: "Email không hợp lệ" },
                ]}
              >
                <Input placeholder="admin@ftes.vn" autoFocus />
              </Form.Item>
              <Form.Item
                label="Mật khẩu"
                name="password"
                rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
              >
                <Input.Password />
              </Form.Item>
              <Form.Item name="remember" valuePropName="checked">
                <Checkbox>Ghi nhớ đăng nhập</Checkbox>
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={login.isPending}
              >
                Đăng nhập
              </Button>
            </Form>

            {socialEnabled && (
              <>
                <Divider plain style={{ marginBlock: 16, fontSize: 12 }}>
                  hoặc
                </Divider>
                {Boolean(googleClientId) && (
                  <Spin spinning={googleLogin.isPending}>
                    <div
                      style={{
                        marginBottom: githubClientId ? 12 : 0,
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <GoogleSignInButton
                        clientId={googleClientId}
                        onCredential={onGoogleCredential}
                      />
                    </div>
                  </Spin>
                )}
                {Boolean(githubClientId) && (
                  <Button
                    block
                    icon={<GithubOutlined />}
                    onClick={onGithubLogin}
                  >
                    Đăng nhập với GitHub
                  </Button>
                )}
              </>
            )}
          </>
        ) : (
          <Form
            form={otpForm}
            layout="vertical"
            onFinish={onVerify}
            autoComplete="off"
          >
            <Form.Item
              label="Mã xác thực"
              name="otp"
              rules={[
                { required: true, message: "Vui lòng nhập mã xác thực" },
                { len: 6, message: "Mã gồm 6 chữ số" },
              ]}
            >
              <Input.OTP length={6} autoFocus />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={verify2fa.isPending}
            >
              Xác nhận
            </Button>
            <Button
              type="link"
              block
              onClick={() => {
                setStep(1);
                setTwoFactorToken("");
                loginForm.resetFields();
              }}
              style={{ marginTop: 8 }}
            >
              Quay lại đăng nhập
            </Button>
          </Form>
        )}
      </Card>
    </div>
  );
}
