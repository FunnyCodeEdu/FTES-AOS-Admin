import { type ReactNode } from "react";
import { Card, Space, Typography } from "antd";

export interface MobileCardMeta {
  label: string;
  value: ReactNode;
}

export interface MobileCardProps {
  title: ReactNode;
  /** Dòng phụ ngay dưới tiêu đề: trạng thái, mã, thời gian… */
  subtitle?: ReactNode;
  /** Các cặp nhãn – giá trị, xếp 2 cột. Dùng cho số liệu ngắn (giá, số học viên). */
  meta?: MobileCardMeta[];
  /** Hành động CHÍNH: full-width, đứng trước mọi thao tác khác. */
  primaryAction?: ReactNode;
  /** Hành động phụ: xếp ngang, chia đều bề ngang. */
  actions?: ReactNode;
  /** Góc phải tiêu đề — thường là menu "…" chứa thao tác ít dùng / nguy hiểm. */
  extra?: ReactNode;
}

/**
 * Khung thẻ cho một bản ghi trên điện thoại.
 *
 * <p>Thứ tự cố định: tiêu đề → dòng phụ → số liệu → hành động chính → hành động phụ. Hành động
 * chính nằm dưới cùng và full-width vì đó là chỗ ngón cái với tới dễ nhất; thao tác nguy hiểm thì
 * đẩy vào `extra` ở góc trên để phải với xa hơn — ma sát có chủ ý.
 */
export function MobileCard({
  title,
  subtitle,
  meta,
  primaryAction,
  actions,
  extra,
}: MobileCardProps) {
  return (
    <Card size="small" styles={{ body: { padding: 12 } }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Typography.Text strong style={{ fontSize: 15, display: "block" }}>
            {title}
          </Typography.Text>
          {subtitle && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {subtitle}
            </Typography.Text>
          )}
        </div>
        {extra && <div style={{ flexShrink: 0 }}>{extra}</div>}
      </div>

      {meta && meta.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 8,
            marginTop: 10,
          }}
        >
          {meta.map((item) => (
            <div key={item.label} style={{ minWidth: 0 }}>
              <Typography.Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                {item.label}
              </Typography.Text>
              <span style={{ fontSize: 13 }}>{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {primaryAction && <div style={{ marginTop: 12 }}>{primaryAction}</div>}

      {actions && (
        <Space style={{ marginTop: 8, width: "100%" }} styles={{ item: { flex: 1 } }}>
          {actions}
        </Space>
      )}
    </Card>
  );
}
