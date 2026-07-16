"use client";

import { Toaster } from "sonner";

/**
 * @description sonner 토스트 전역 마운트 래퍼 — 루트 레이아웃에서 한 번만 렌더링하고, 각 클라이언트 컴포넌트에서 `toast()` 호출로 사용
 */
export default function AppToaster() {
  // richColors: error/success 등 상태별 기본 색상 활성화, 모바일 사용 비중을 고려해 하단 중앙 배치
  return <Toaster position="bottom-center" richColors duration={3000} />;
}
