import { useTranslations } from "next-intl";

import { formatKstLongDate } from "@/lib/date-utils";
import { fighterNameKey } from "@/lib/fighter-name-utils";
import type { OpponentPrediction } from "@/types/prediction";

interface PreviousCandidatesProps {
  /** 확정 전 마지막으로 생성된 AI 후보 */
  candidates: OpponentPrediction[];
  /** 실제 확정 상대 영문명. 적중 판정에 쓴다 */
  actualOpponentEn: string;
  /** 후보 생성 시각 (UTC ISO) */
  generatedAt: string;
  /** "ko" | "en" */
  locale: string;
}

/**
 * @description 확정 경기 화면 아래에 "확정 전 AI가 꼽았던 후보"를 접어서 보여 준다. 실제 상대가 후보에 있었으면 적중으로 표시한다.
 * JS 없이 열리도록 네이티브 details를 쓴다. 접힌 내용도 HTML에 남아 크롤러가 읽는다.
 * @param props.candidates - 확정 전 AI 후보
 * @param props.actualOpponentEn - 실제 확정 상대 영문명
 * @param props.generatedAt - 후보 생성 시각
 * @param props.locale - "ko" | "en"
 */
export default function PreviousCandidates({
  candidates,
  actualOpponentEn,
  generatedAt,
  locale,
}: PreviousCandidatesProps) {
  const t = useTranslations("predictions");
  const lang = locale === "ko" ? "ko" : "en";
  const actualKey = fighterNameKey(actualOpponentEn);
  const isActual = (c: OpponentPrediction) =>
    fighterNameKey(c.name.en) === actualKey;
  const hit = candidates.some(isActual);

  return (
    <details className="group mt-10 rounded-2xl bg-white border border-border/60 shadow-card overflow-hidden">
      <summary className="flex items-center gap-3 p-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-foreground">
            {t("previousPicks")}
          </h2>
          <p className="text-[11px] text-muted mt-0.5">
            {t("previousPicksDate", {
              date: formatKstLongDate(generatedAt, locale),
            })}
          </p>
        </div>
        <span
          className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
            hit ? "bg-win/10 text-win" : "bg-surface text-muted"
          }`}
        >
          {hit ? t("pickHit") : t("pickMiss")}
        </span>
        <svg
          className="shrink-0 w-4 h-4 text-muted transition-transform duration-200 group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </summary>

      <div className="px-5 pb-5">
        <p className="text-xs text-muted mb-3">{t("previousPicksNote")}</p>
        <ul className="space-y-2">
          {candidates.map((c) => {
            const actual = isActual(c);
            const hasImage = c.imageUrl && !c.imageUrl.includes("placeholder");
            return (
              <li
                key={c.name.en}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  actual ? "border-win/40 bg-win/5" : "border-border/60"
                }`}
              >
                <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-surface ring-1 ring-border">
                  {hasImage && (
                    <img
                      src={c.imageUrl}
                      alt={c.name[lang]}
                      className="w-full h-full object-cover object-top"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                    <span className="truncate">{c.name[lang]}</span>
                    {actual && (
                      <span className="shrink-0 px-1.5 py-px rounded-md bg-win text-white text-[10px] font-bold">
                        {t("actualOpponent")}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted">
                    {c.record.wins}-{c.record.losses}-{c.record.draws}
                    {/* keep-all이면 공백에서 끊겨 #순위만 다음 줄로 떨어진다 */}
                    {c.fightMatrixRank > 0 &&
                      ` · FightMatrix #${c.fightMatrixRank}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] text-muted">{t("koWinLabel")}</p>
                  <p className="text-sm font-black text-foreground tabular-nums">
                    {c.winProbability}%
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
