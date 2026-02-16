"use client";

import { useInView } from "@/hooks/useInView";

interface AnimateOnScrollProps {
  children: React.ReactNode;
  animation?: "fade-up" | "fade-in" | "scale-in" | "slide-left";
  delay?: number;
  className?: string;
}

export default function AnimateOnScroll({
  children,
  animation = "fade-up",
  delay = 0,
  className = "",
}: AnimateOnScrollProps) {
  const { ref, isInView } = useInView(0.1);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isInView ? undefined : 0,
        animation: isInView
          ? `${animation} 0.6s ease-out ${delay}ms both`
          : "none",
      }}
    >
      {children}
    </div>
  );
}
