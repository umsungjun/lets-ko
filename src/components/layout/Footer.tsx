import { useTranslations } from "next-intl";

import { Link } from "../../../i18n/navigation";

const FOOTER_LINKS = [
  { href: "/predictions", key: "linkPredictions" },
  { href: "/schedule", key: "linkSchedule" },
  { href: "/rankings", key: "linkRankings" },
  { href: "/youtube", key: "linkYoutube" },
  { href: "/cheer", key: "linkCheer" },
] as const;

/**
 * @description 전역 푸터. 사이트 메뉴 링크로 하위 페이지 간 크롤 경로를 만든다.
 */
export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-border/60 bg-surface py-8 mt-0">
      {/* 하위 페이지끼리 상호 링크가 없어 크롤 경로가 메인에서 아래로만 흐른다. 앵커 텍스트는 헤더 nav보다 길게 잡아 키워드를 준다 */}
      <nav
        aria-label={t("linksLabel")}
        className="max-w-6xl mx-auto px-6 mb-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted"
      >
        {FOOTER_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="hover:text-primary transition-colors"
          >
            {t(item.key)}
          </Link>
        ))}
      </nav>

      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
        <p>{t("disclaimer")}</p>
        <div className="flex items-center gap-4">
          <a
            href="mailto:umseongjun@naver.com"
            className="font-medium hover:text-primary transition-colors"
          >
            umseongjun@naver.com
          </a>
          <a
            href="https://github.com/umsungjun"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
            aria-label="GitHub"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
