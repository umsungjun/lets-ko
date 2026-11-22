import { useTranslations } from "next-intl";

import { formatFullDate } from "@/lib/date-utils";
import type { FightHistoryEntry } from "@/types/fighter";

interface LastFightCardProps {
  /** 고석현 최근 경기 (전적 히스토리 첫 항목) */
  fight: FightHistoryEntry;
  /** 상대 한국어명. 사전에 없으면 영문으로 표시 */
  opponentKo?: string;
  /** "ko" | "en" */
  locale: string;
}

const RESULT_STYLE: Record<FightHistoryEntry["result"], string> = {
  win: "bg-win",
  loss: "bg-loss",
  draw: "bg-muted",
  nc: "bg-muted",
};

/**
 * @description 고석현 최근 경기 요약 카드(결과·상대·방식·대회·날짜). 예측 페이지에 후보가 아직 없을 때 빈 화면 대신 띄운다.
 * @param props.fight - 최근 경기
 * @param props.opponentKo - 상대 한국어명
 * @param props.locale - "ko" | "en"
 */
export default function LastFightCard({
  fight,
  opponentKo,
  locale,
}: LastFightCardProps) {
  const t = useTranslations("predictions");
  const opponentName =
    locale === "ko" && opponentKo ? opponentKo : fight.opponent;

  return (
    <div
      className="p-5 sm:p-6 rounded-2xl bg-white border border-border/60 shadow-card animate-fade-up"
      style={{ animationDelay: "100ms" }}
    >
      <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">
        {t("lastFightDate")}
      </h2>
      <div className="flex items-center gap-4">
        <span
          className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-black ${RESULT_STYLE[fight.result]}`}
        >
          {t(`result.${fight.result}`)}
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold text-foreground">
            {t("vs")} {opponentName}
          </p>
          <p className="text-sm text-muted mt-0.5">
            {fight.method}
            {fight.round > 0 && ` · R${fight.round} ${fight.time}`}
          </p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-border/60 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        {/* 크롤 전적은 대회명을 비워 저장한다(ufc-crawler). 캐시 전적에만 있다 */}
        {fight.event && <span>{fight.event}</span>}
        <span>{formatFullDate(fight.date, locale)}</span>
      </div>
    </div>
  );
}
