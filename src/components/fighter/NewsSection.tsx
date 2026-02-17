"use client";

import { useTranslations } from "next-intl";

import { useInView } from "@/hooks/useInView";
import type { NewsArticle } from "@/lib/news";
import { SEARCH_QUERY } from "@/lib/news";

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
    <section className="py-20 px-4" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <div
          className="flex items-center justify-between mb-10"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <h2 className="section-heading">{t("title")}</h2>
          <a
            href={`https://news.google.com/search?q=${encodeURIComponent(SEARCH_QUERY)}&hl=ko&gl=KR`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-white text-muted hover:text-primary hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 text-sm font-medium cursor-pointer shrink-0"
          >
            {t("moreNews")}
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                className="group p-5 rounded-2xl bg-white border border-border shadow-card hover:shadow-card-hover hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                style={{
                  opacity: isInView ? 1 : 0,
                  transform: isInView ? "translateY(0)" : "translateY(16px)",
                  transition: `opacity 0.5s ease ${150 + index * 80}ms, transform 0.5s ease ${150 + index * 80}ms`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-linear-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 mt-0.5 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
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
                    <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-200 leading-snug">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2.5">
                      {article.source && (
                        <span className="text-xs font-medium text-primary/80 bg-primary/5 px-2.5 py-0.5 rounded-full ring-1 ring-primary/10">
                          {article.source}
                        </span>
                      )}
                      {timeAgo && (
                        <span className="text-xs text-muted">{timeAgo}</span>
                      )}
                      <svg
                        className="w-3.5 h-3.5 text-muted/0 group-hover:text-primary/50 transition-all duration-200 ml-auto shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
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
