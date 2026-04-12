import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ff5757",
          borderRadius: "7px",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: "-0.5px",
            fontFamily: "serif",
          }}
        >
          wiw
        </span>
      </div>
    ),
    { ...size }
  );
}
