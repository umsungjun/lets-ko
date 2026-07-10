"use client";

import { useEffect } from "react";

/**
 * @description 루트/로케일 레이아웃 자체에서 예외 발생 시의 최상위 폴백. 자체 html/body를 렌더. (App Router global-error.tsx)
 * @param props.error - 발생한 에러
 * @param props.reset - 재렌더 시도 함수
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8 }}>
          문제가 발생했습니다 · Something went wrong
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: 24 }}>
          잠시 후 다시 시도해 주세요. · Please try again in a moment.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "0.625rem 1.25rem",
            borderRadius: 12,
            background: "#dc2626",
            color: "#fff",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          다시 시도 · Try again
        </button>
      </body>
    </html>
  );
}
