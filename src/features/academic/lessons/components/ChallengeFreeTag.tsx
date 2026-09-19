import { Tag } from "antd";

export function ChallengeFreeTag({ free }: { free?: boolean }) {
  if (!free) return null;
  return (
    <Tag color="green" title="Mở miễn phí cho học thử">
      FREE
    </Tag>
  );
}
