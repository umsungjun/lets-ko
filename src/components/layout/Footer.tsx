import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-border/60 bg-surface py-8 mt-0">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
        <p>{t("disclaimer")}</p>
        <a
          href="mailto:umseongjun@naver.com"
          className="font-medium hover:text-primary transition-colors"
        >
          umseongjun@naver.com
        </a>
      </div>
    </footer>
  );
}
