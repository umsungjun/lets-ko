import { ImageResponse } from "next/og";

import fs from "fs";
import path from "path";

export async function GET() {
  // Google Fonts에서 한국어 폰트 로드 (node UA → TTF 반환)
  let fontData: ArrayBuffer | null = null;
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700;900&display=swap",
      { headers: { "User-Agent": "node" } }
    ).then((r) => r.text());

    const fontUrl = css.match(/url\(([^)]+)\)/)?.[1];
    if (fontUrl) {
      fontData = await fetch(fontUrl).then((r) => r.arrayBuffer());
    }
  } catch {}

  // 선수 이미지를 파일시스템에서 직접 읽어 base64 data URL로 변환
  let imageDataUrl: string | null = null;
  try {
    const imagePath = path.join(
      process.cwd(),
      "public",
      "images",
      "ko-seokhyeon.png"
    );
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString("base64");
    imageDataUrl = `data:image/png;base64,${base64}`;
  } catch {}

  const font = fontData ? "Noto Sans KR" : "sans-serif";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: "#0a0a0a",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 왼쪽 빨간 세로 바 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "8px",
          backgroundColor: "#dc2626",
        }}
      />

      {/* 배경 대각선 장식 */}
      <div
        style={{
          position: "absolute",
          right: "480px",
          top: 0,
          bottom: 0,
          width: "2px",
          backgroundColor: "#1a1a1a",
          transform: "skewX(-8deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "500px",
          top: 0,
          bottom: 0,
          width: "1px",
          backgroundColor: "#1a1a1a",
          transform: "skewX(-8deg)",
        }}
      />

      {/* 왼쪽 콘텐츠 영역 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "56px 48px 56px 68px",
          justifyContent: "space-between",
        }}
      >
        {/* 상단: LET'S KO 배지 */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              backgroundColor: "#dc2626",
              color: "white",
              fontFamily: font,
              fontWeight: 900,
              fontSize: "20px",
              padding: "6px 18px",
              borderRadius: "6px",
              letterSpacing: "3px",
            }}
          >
            {"LET'S KO"}
          </div>
          <div
            style={{
              color: "#555",
              fontSize: "15px",
              fontFamily: font,
            }}
          >
            비공식 팬 응원 사이트
          </div>
        </div>

        {/* 중앙: 이름 + 정보 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* 한국어 이름 */}
          <div
            style={{
              color: "white",
              fontFamily: font,
              fontWeight: 900,
              fontSize: "108px",
              lineHeight: 1,
              letterSpacing: "-3px",
            }}
          >
            고석현
          </div>

          {/* 영문 이름 + 별명 */}
          <div
            style={{
              color: "#dc2626",
              fontFamily: font,
              fontWeight: 700,
              fontSize: "28px",
              letterSpacing: "0.5px",
            }}
          >
            Ko Seokhyeon · The Korean Tyson
          </div>

          {/* 구분선 */}
          <div
            style={{
              width: "60px",
              height: "3px",
              backgroundColor: "#dc2626",
              marginTop: "4px",
              marginBottom: "4px",
            }}
          />

          {/* 체급 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "8px",
            }}
          >
            <div
              style={{
                color: "white",
                fontFamily: font,
                fontWeight: 700,
                fontSize: "28px",
              }}
            >
              UFC 웰터급
            </div>
          </div>
        </div>

        {/* 하단: URL */}
        <div
          style={{
            color: "#333",
            fontFamily: font,
            fontSize: "16px",
            letterSpacing: "2px",
          }}
        >
          {(() => {
            try {
              return new URL(process.env.NEXT_PUBLIC_SITE_URL || "").hostname;
            } catch {
              return "lets-ko.vercel.app";
            }
          })()}
        </div>
      </div>

      {/* 오른쪽 선수 이미지 */}
      {imageDataUrl && (
        <div
          style={{
            width: "360px",
            height: "100%",
            display: "flex",
            overflow: "hidden",
            position: "relative",
            marginRight: "140px",
          }}
        >
          <img
            src={imageDataUrl}
            alt="고석현"
            width={360}
            height={630}
            style={{
              width: "360px",
              height: "630px",
              objectFit: "cover",
            }}
          />
          {/* 왼쪽 페이드 그라데이션 오버레이 */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: "120px",
              background:
                "linear-gradient(to right, #0a0a0a 0%, transparent 100%)",
            }}
          />
        </div>
      )}
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: fontData
        ? [
            {
              name: "Noto Sans KR",
              data: fontData,
              style: "normal",
              weight: 700,
            },
          ]
        : [],
    }
  );
}
