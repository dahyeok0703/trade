import { ImageResponse } from "next/og";

// Static OG image generated at build time (no dynamic data).
// NOTE: copy is intentionally Latin-only — ImageResponse's built-in font has no
// Korean glyphs, and relying on remote font fetching makes builds fragile. The
// document output is English (trade standard), so an English card fits the brand.
export const alt = "TradeDocs — Export documents, done right the first time";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Navy + teal brand palette.
const NAVY = "#0f172a";
const TEAL = "#14b8a6";
const MUTED = "#94a3b8";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: NAVY,
          color: "white",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "44px" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "14px",
              backgroundColor: TEAL,
              color: NAVY,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "30px",
              fontWeight: 800,
            }}
          >
            TD
          </div>
          <div style={{ fontSize: "38px", fontWeight: 700 }}>TradeDocs</div>
        </div>
        <div style={{ fontSize: "62px", fontWeight: 800, lineHeight: 1.15, maxWidth: "960px" }}>
          One order in. Invoice & packing list out.
        </div>
        <div style={{ marginTop: "30px", fontSize: "32px", color: MUTED, maxWidth: "900px" }}>
          Number mismatches caught automatically — export paperwork for small exporters.
        </div>
      </div>
    ),
    { ...size },
  );
}
