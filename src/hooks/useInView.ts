"use client";

import { useEffect, useRef, useState } from "react";

/**
 * @description 요소가 뷰포트에 들어왔는지 감지. 콘텐츠를 숨기는 리빌 연출에는 쓰지 말 것.
 * 초기값이 false라 서버 렌더 HTML에 비가시 상태가 박히고, JS를 실행하지 않는 크롤러(네이버 Yeti 등)에는 빈 화면으로 읽힌다.
 * 페이드업 같은 등장 연출은 globals.css의 .animate-* 클래스를 쓴다.
 * @param threshold - IntersectionObserver 임계값 (기본 0.1)
 * @returns 관찰 대상에 붙일 ref와 진입 여부
 */
export const useInView = (threshold = 0.1) => {
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
};
