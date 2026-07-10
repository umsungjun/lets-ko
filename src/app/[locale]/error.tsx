"use client";

import { useEffect } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * @description 로케일 하위 페이지에서 렌더 중 예외 발생 시 표시하는 에러 바운더리.
 * 작은 예외가 전체 500으로 확대되는 것을 막고 재시도/홈 이동을 제공. (App Router error.tsx)
 * @param props.error - 발생한 에러 (digest 포함 가능)
 * @param props.reset - 해당 세그먼트 재렌더 시도 함수
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const isKo = !pathname.startsWith("/en");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-black text-primary mb-4">!</p>
      <h1 className="text-xl font-bold text-foreground mb-2">
        {isKo ? "문제가 발생했습니다" : "Something went wrong"}
      </h1>
      <p className="text-sm text-muted mb-6">
        {isKo ? "잠시 후 다시 시도해 주세요." : "Please try again in a moment."}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors cursor-pointer"
        >
          {isKo ? "다시 시도" : "Try again"}
        </button>
        <Link
          href={isKo ? "/" : "/en"}
          className="px-5 py-2.5 rounded-xl border border-border text-foreground font-semibold hover:border-primary/40 transition-colors"
        >
          {isKo ? "홈으로" : "Home"}
        </Link>
      </div>
    </div>
  );
}
