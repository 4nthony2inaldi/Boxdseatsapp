import { ImageResponse } from "next/og";

export const alt = "BoxdSeats";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0D0F14",
          backgroundImage:
            "radial-gradient(circle at 50% 30%, rgba(212,135,44,0.18), transparent 60%)",
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            letterSpacing: "-2px",
            color: "#F0EBE0",
            display: "flex",
          }}
        >
          Boxd
          <span style={{ color: "#D4872C" }}>Seats</span>
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 34,
            color: "#9BA1B5",
            display: "flex",
          }}
        >
          Your sports identity platform
        </div>
      </div>
    ),
    { ...size }
  );
}
