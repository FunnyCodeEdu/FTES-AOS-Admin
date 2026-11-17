import { Empty, theme } from "antd";
import { moneyLabel, numberLabel } from "./labels";

/** A bounded responsive chart using existing theme tokens, with readable values in each SVG title. */
export function MarketTrend({ points, monetary = false, label }: {
  points: Array<{ day: string; value: number }>; monetary?: boolean; label: string;
}) {
  const { token } = theme.useToken();
  if (!points.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có số liệu trong khoảng này" />;
  const max = Math.max(1, ...points.map(p => Math.abs(Number(p.value))));
  const width = 820, height = 230, left = 64, bottom = 30, top = 18;
  const plotWidth = width - left - 12, plotHeight = height - bottom - top;
  const hasNegative = points.some(p => Number(p.value) < 0);
  const zeroY = hasNegative ? top + plotHeight / 2 : top + plotHeight;
  const scale = hasNegative ? plotHeight / (2 * max) : plotHeight / max;
  const barWidth = Math.max(1, Math.min(28, plotWidth / points.length * .7));
  const format = monetary ? moneyLabel : numberLabel;
  return <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} style={{ width: "100%", minHeight: 170 }}>
    <line x1={left} y1={zeroY} x2={width - 8} y2={zeroY} stroke={token.colorBorderSecondary} />
    <text x={left - 8} y={top + 10} textAnchor="end" fill={token.colorTextSecondary} fontSize={11}>{numberLabel(max)}</text>
    <text x={left - 8} y={zeroY} textAnchor="end" fill={token.colorTextSecondary} fontSize={11}>0</text>
    {points.map((point, i) => {
      const x = left + plotWidth * (i + .5) / points.length;
      const value = Number(point.value), h = Math.max(.5, Math.abs(value) * scale);
      return <g key={point.day}>
        <rect x={x - barWidth / 2} y={value >= 0 ? zeroY - h : zeroY} width={barWidth} height={h}
          rx={2} fill={value < 0 ? token.colorError : token.colorPrimary}>
          <title>{point.day}: {format(value)}</title>
        </rect>
        {(i === 0 || i === points.length - 1 || i % Math.max(1, Math.floor(points.length / 5)) === 0) &&
          <text x={x} y={height - 9} textAnchor="middle" fill={token.colorTextSecondary} fontSize={10}>{point.day.slice(5)}</text>}
      </g>;
    })}
  </svg>;
}
