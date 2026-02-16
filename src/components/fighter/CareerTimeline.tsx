"use client";

import { useTranslations } from "next-intl";

import { useInView } from "@/hooks/useInView";
import type { CareerHighlight } from "@/types/fighter";

interface CareerTimelineProps {
  highlights: CareerHighlight[];
  locale: string;
}

const categoryIcons: Record<string, string> = {
  achievement: "🏆",
  fight: "🥊",
  title: "🏅",
  debut: "⭐",
};

export default function CareerTimeline({
  highlights,
  locale,
}: CareerTimelineProps) {
  const t = useTranslations("timeline");
  const { ref, isInView } = useInView(0.05);

  return (
    <section className="py-16 px-4 bg-surface" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <h2
          className="section-heading section-heading-center text-center mb-12"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          {t("title")}
        </h2>

        <div className="relative">
          <div
            className="absolute left-6 top-0 bottom-0 w-px bg-linear-to-b from-primary/40 via-primary/20 to-transparent"
            style={{
              opacity: isInView ? 1 : 0,
              transition: "opacity 0.8s ease 0.2s",
            }}
          />

          <div className="flex flex-col gap-6">
            {highlights.map((item, index) => {
              const title = locale === "ko" ? item.title.ko : item.title.en;
              const description =
                locale === "ko" ? item.description.ko : item.description.en;

              return (
                <div
                  key={index}
                  className="relative flex items-start gap-5"
                  style={{
                    opacity: isInView ? 1 : 0,
                    transform: isInView ? "translateX(0)" : "translateX(-20px)",
                    transition: `opacity 0.5s ease ${200 + index * 120}ms, transform 0.5s ease ${200 + index * 120}ms`,
                  }}
                >
                  <div className="relative z-10 w-12 h-12 rounded-full bg-white border-2 border-primary/30 shadow-card flex items-center justify-center shrink-0 text-lg">
                    {categoryIcons[item.category] || "📌"}
                  </div>

                  <div className="flex-1 p-4 rounded-2xl bg-white border border-border shadow-card hover:shadow-card-hover transition-shadow -mt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-primary bg-primary-light px-2 py-0.5 rounded-full">
                        {item.year}
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground">{title}</h3>
                    <p className="text-sm text-muted mt-1 leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
