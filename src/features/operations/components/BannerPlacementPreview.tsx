import type { BannerPlacement } from "../shared/types";

interface BannerPlacementPreviewProps {
  placement: BannerPlacement;
  imageUrl?: string;
  linkUrl?: string;
}

const PLACEMENT_STYLES: Record<BannerPlacement, React.CSSProperties> = {
  "home-hero": { width: "100%", maxWidth: 600, height: 200, borderRadius: 8 },
  sidebar: { width: 240, height: 320, borderRadius: 8 },
  "subject-top": { width: "100%", maxWidth: 600, height: 120, borderRadius: 8 },
};

export function BannerPlacementPreview({ placement, imageUrl, linkUrl }: BannerPlacementPreviewProps) {
  return (
    <div
      style={{
        ...PLACEMENT_STYLES[placement],
        background: imageUrl ? `url(${imageUrl}) center/cover` : "#f0f0f0",
        border: "1px dashed #d9d9d9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {!imageUrl && <span style={{ color: "#999" }}>Preview {placement}</span>}
      {imageUrl && linkUrl && (
        <a href={linkUrl} target="_blank" rel="noreferrer" style={{ display: "none" }}>
          link
        </a>
      )}
    </div>
  );
}
