import { Space, Switch, Tag, Tooltip } from "antd";

export function ChallengeFreeTag({ free }: { free?: boolean }) {
  if (!free) return null;
  return (
    <Tag color="green" title="Mở miễn phí cho học thử">
      FREE
    </Tag>
  );
}

export function ChallengeFreeControl({
  free,
  loading,
  onChange,
}: {
  free?: boolean;
  loading?: boolean;
  onChange: (free: boolean) => void;
}) {
  const checked = Boolean(free);
  return (
    <Tooltip title="Bật để mở miễn phí challenge này cho học viên học thử">
      <Space size={4}>
        <Tag color={checked ? "green" : undefined}>FREE</Tag>
        <Switch
          aria-label="Bật miễn phí challenge"
          size="small"
          checked={checked}
          loading={loading}
          onChange={onChange}
        />
      </Space>
    </Tooltip>
  );
}
