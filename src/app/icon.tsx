import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
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
          background: "linear-gradient(160deg, #17315c, #2aa0c4)",
          color: "white",
          fontSize: 260,
          fontWeight: 700,
        }}
      >
        K
      </div>
    ),
    { ...size },
  );
}
