"use client";

import { useEffect, useRef, useState } from "react";

export function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // 모바일에서 뷰포트 계산 오류나 Observer 미감지 시 폴백
    const fallbackTimer = setTimeout(() => setIsInView(true), 800);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(element);
          clearTimeout(fallbackTimer);
        }
      },
      {
        threshold,
        // 뷰포트 아래 100px 전부터 미리 감지 (모바일 동적 주소창 대응)
        rootMargin: "0px 0px 100px 0px",
      }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, [threshold]);

  return { ref, isInView };
}
