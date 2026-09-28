interface AnalysisCardProps {
  /** 카드 제목 (번역된 값) */
  title: string;
  /** 본문 텍스트 */
  text: string;
  /** 아이콘·색. amber는 매칭 가능성(정보), blue는 승부 분석(차트) */
  tone: "amber" | "blue";
}

const TONE = {
  amber: {
    box: "bg-amber-50",
    icon: "text-amber-500",
    path: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  blue: {
    box: "bg-blue-50",
    icon: "text-blue-500",
    path: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
} as const;

/**
 * @description 예측 페이지의 텍스트 분석 카드(아이콘 + 소제목 + 본문). 후보 예측·확정 경기 분석 공용
 * @param props.title - 카드 제목
 * @param props.text - 본문 텍스트
 * @param props.tone - "amber" | "blue"
 */
export default function AnalysisCard({ title, text, tone }: AnalysisCardProps) {
  const style = TONE[tone];
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-border/60 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`w-6 h-6 rounded-lg ${style.box} flex items-center justify-center`}
        >
          <svg
            className={`w-3.5 h-3.5 ${style.icon}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={style.path}
            />
          </svg>
        </span>
        <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">{text}</p>
    </div>
  );
}
