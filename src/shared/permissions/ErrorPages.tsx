import { Button, Result, Tag, Typography } from "antd";
import { useLocation, Link } from "react-router-dom";

export function ForbiddenPage() {
  const location = useLocation();
  const state = location.state as
    | { missingPermissions?: string[]; from?: string }
    | undefined;
  const missing = state?.missingPermissions ?? [];
  const from = state?.from ?? location.pathname;

  return (
    <Result
      status="403"
      title="403 - Không có quyền truy cập"
      subTitle={
        <Typography.Paragraph>
          Bạn không có quyền truy cập <Typography.Text code>{from}</Typography.Text>.
          {missing.length > 0 && (
            <>
              {" "}
              Các quyền còn thiếu:
              <div style={{ marginTop: 12 }}>
                {missing.map((p) => (
                  <Tag key={p} color="red">
                    {p}
                  </Tag>
                ))}
              </div>
            </>
          )}
        </Typography.Paragraph>
      }
      extra={
        <Link to="/">
          <Button type="primary">Về trang chủ</Button>
        </Link>
      }
    />
  );
}

export function NotFoundPage() {
  return (
    <Result
      status="404"
      title="404 - Không tìm thấy trang"
      subTitle="Trang bạn yêu cầu không tồn tại hoặc đã được di chuyển."
      extra={
        <Link to="/">
          <Button type="primary">Về trang chủ</Button>
        </Link>
      }
    />
  );
}
