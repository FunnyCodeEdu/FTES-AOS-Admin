import { useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Typography,
  App,
} from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "./store";
import { useLogin, useMe, useVerify2FA } from "./api";
import type { LoginCredentials, Verify2FARequest } from "./api";

function isInternalUrl(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return url.startsWith("/") && !url.startsWith("//");
  }
}

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notification } = App.useApp();
  const setSession = useAuthStore((s) => s.setSession);
  const [step, setStep] = useState<1 | 2>(1);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [remember, setRemember] = useState(false);
  const [loginForm] = Form.useForm<LoginCredentials>();
  const [otpForm] = Form.useForm<Verify2FARequest>();
  const { refetch: refetchMe } = useMe();

  const login = useLogin();
  const verify2fa = useVerify2FA();

  const returnUrl = searchParams.get("returnUrl") ?? "/";
  const redirectTarget = isInternalUrl(returnUrl) ? returnUrl : "/";

  const setTokens = useAuthStore((s) => s.setTokens);

  const finishSession = async (
    tokens: { accessToken: string; refreshToken: string },
    rememberMe: boolean
  ) => {
    setTokens(tokens.accessToken, tokens.refreshToken);
    const { data } = await refetchMe();
    if (!data) {
      notification.error({ message: "Không thể lấy thông tin người dùng" });
      return;
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
  };

  const onLogin = (values: LoginCredentials) => {
    setRemember(values.remember ?? false);
    login.mutate(values, {
      onSuccess: (res) => {
        if (res.twoFactorRequired && res.twoFactorToken) {
          setTwoFactorToken(res.twoFactorToken);
          setStep(2);
          otpForm.resetFields();
        } else if (res.accessToken && res.refreshToken) {
          finishSession(
            { accessToken: res.accessToken, refreshToken: res.refreshToken },
            values.remember ?? false
          );
        }
      },
    });
  };

  const onVerify = (values: Verify2FARequest) => {
    verify2fa.mutate(
      { twoFactorToken, otp: values.otp },
      {
        onSuccess: (res) => {
          finishSession(
            { accessToken: res.accessToken, refreshToken: res.refreshToken },
            remember
          );
        },
      }
    );
  };

  const error = login.error || verify2fa.error;

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
