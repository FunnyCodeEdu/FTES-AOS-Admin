import { Card, Empty, Skeleton } from "antd";
import type { ChartData } from "../shared/types";

interface ChartRendererProps {
  chart: ChartData;
  height?: number;
}

function LineChart({ chart, height }: { chart: ChartData; height: number }) {
  const width = 600;
  const padding = 32;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const allValues = chart.datasets.flatMap((d) => d.data);
  const max = Math.max(1, ...allValues);
  const min = Math.min(0, ...allValues);
  const range = max - min || 1;

  const xFor = (i: number) => padding + (i / Math.max(1, chart.labels.length - 1)) * innerWidth;
  const yFor = (v: number) => padding + innerHeight - ((v - min) / range) * innerHeight;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      <rect x={padding} y={padding} width={innerWidth} height={innerHeight} fill="#fafafa" rx={4} />
      {chart.datasets.map((dataset) => {
        const path = dataset.data
          .map((value, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(value)}`)
          .join(" ");
        return (
          <g key={dataset.label}>
            <path d={path} fill="none" stroke={dataset.color ?? "#1677ff"} strokeWidth={2} />
            {dataset.data.map((value, i) => (
              <circle key={i} cx={xFor(i)} cy={yFor(value)} r={3} fill={dataset.color ?? "#1677ff"} />
            ))}
          </g>
        );
      })}
      <text x={padding} y={height - 4} fontSize={10} fill="#888">
        {chart.labels[0]}
      </text>
      <text x={width - padding} y={height - 4} fontSize={10} fill="#888" textAnchor="end">
        {chart.labels[chart.labels.length - 1]}
      </text>
    </svg>
  );
}

function BarChart({ chart, height }: { chart: ChartData; height: number }) {
  const width = 600;
  const padding = 32;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const max = Math.max(1, ...chart.datasets.flatMap((d) => d.data));
  const groupCount = chart.labels.length;
  const groupWidth = innerWidth / groupCount;
  const barGap = 4;
  const datasetCount = chart.datasets.length;
  const barWidth = (groupWidth - barGap * 2) / Math.max(1, datasetCount);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      <rect x={padding} y={padding} width={innerWidth} height={innerHeight} fill="#fafafa" rx={4} />
      {chart.labels.map((label, gi) => (
        <g key={label}>
          {chart.datasets.map((dataset, di) => {
            const value = dataset.data[gi] ?? 0;
            const barHeight = (value / max) * innerHeight;
            const x = padding + gi * groupWidth + barGap + di * barWidth;
            const y = padding + innerHeight - barHeight;
            return (
              <rect
                key={`${dataset.label}-${di}`}
                x={x}
                y={y}
                width={barWidth - 2}
                height={barHeight}
                fill={dataset.color ?? "#52c41a"}
                rx={2}
              />
            );
          })}
          <text
            x={padding + gi * groupWidth + groupWidth / 2}
            y={height - 4}
            fontSize={10}
            fill="#888"
            textAnchor="middle"
          >
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function PieChart({ chart, height }: { chart: ChartData; height: number }) {
  const size = Math.min(600, height * 2);
  const radius = size / 2 - 32;
  const center = size / 2;
  const total = Math.max(1, chart.datasets[0]?.data.reduce((a, b) => a + b, 0) ?? 1);
  const colors = ["#1677ff", "#52c41a", "#faad14", "#f5222d", "#722ed1", "#13c2c2"];

  let startAngle = 0;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", height }}>
      {chart.datasets[0]?.data.map((value, i) => {
        const angle = (value / total) * Math.PI * 2;
        const endAngle = startAngle + angle;
        const x1 = center + radius * Math.cos(startAngle);
        const y1 = center + radius * Math.sin(startAngle);
        const x2 = center + radius * Math.cos(endAngle);
        const y2 = center + radius * Math.sin(endAngle);
        const largeArc = angle > Math.PI ? 1 : 0;
        const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        const slice = (
          <path
            key={i}
            d={path}
            fill={colors[i % colors.length]}
            stroke="#fff"
            strokeWidth={2}
          />
        );
        startAngle = endAngle;
        return slice;
      })}
    </svg>
  );
}

function ChartBody({ chart, height }: ChartRendererProps) {
  switch (chart.type) {
    case "line":
      return <LineChart chart={chart} height={height ?? 240} />;
    case "bar":
      return <BarChart chart={chart} height={height ?? 240} />;
    case "pie":
      return <PieChart chart={chart} height={height ?? 240} />;
    default:
      return null;
  }
}

export function ChartRenderer({ chart, height = 240 }: ChartRendererProps) {
  const hasData = chart.datasets.some((d) => d.data.length > 0 && d.data.some((v) => v > 0));

  return (
    <Card title={chart.title} size="small" bodyStyle={{ padding: 12 }}>
      {hasData ? (
        <ChartBody chart={chart} height={height} />
      ) : (
        <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Empty description="Không có dữ liệu trong khoảng này" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      )}
    </Card>
  );
}

export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <Card size="small" bodyStyle={{ padding: 12 }}>
      <Skeleton active paragraph={{ rows: 0 }} title={{ width: "40%" }} />
      <Skeleton.Node active style={{ width: "100%", height }}>
        <div />
      </Skeleton.Node>
    </Card>
  );
}
