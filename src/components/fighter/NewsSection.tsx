"use client";

import { useTranslations } from "next-intl";

import { useInView } from "@/hooks/useInView";
import type { NewsArticle } from "@/lib/news";

import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface NewsSectionProps {
  articles: NewsArticle[];
  locale: string;
}

export default function NewsSection({ articles, locale }: NewsSectionProps) {
  const t = useTranslations("news");
  const { ref, isInView } = useInView(0.1);

  if (articles.length === 0) return null;

  return (
    <section className="py-16 px-4" ref={ref}>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article, index) => {
            let timeAgo = "";
            try {
              timeAgo = formatDistanceToNow(new Date(article.pubDate), {
                addSuffix: true,
                locale: locale === "ko" ? ko : undefined,
              });
            } catch {
              // ignore
            }

            return (
              <a
                key={index}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-5 rounded-2xl bg-white border border-border shadow-card hover:shadow-card-hover hover:border-primary/20 transition-all"
                style={{
                  opacity: isInView ? 1 : 0,
                  transform: isInView ? "translateY(0)" : "translateY(16px)",
                  transition: `opacity 0.5s ease ${150 + index * 80}ms, transform 0.5s ease ${150 + index * 80}ms`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      {article.source && (
                        <span className="text-xs font-medium text-primary/70 bg-primary/5 px-2 py-0.5 rounded-full">
                          {article.source}
                        </span>
                      )}
                      {timeAgo && (
                        <span className="text-xs text-muted">{timeAgo}</span>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
