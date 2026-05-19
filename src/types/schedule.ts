/** UFC 파이터 기본 정보 */
export interface UfcEventFighter {
  /** 파이터 이름 (영문) */
  name: string;
  /** 전적 (예: "22-7-0") */
  record?: string;
  /** UFC 프로필 페이지에서 스크레이핑한 헤드샷 URL */
  imageUrl?: string;
}

/** 단일 매치업 (메인 이벤트 / 코메인 이벤트) */
export interface UfcEventFight {
  fighter1: UfcEventFighter;
  fighter2: UfcEventFighter;
  /** 타이틀 매치 여부 */
  titleFight?: boolean;
  /** 체급 (예: "Welterweight") */
  weightClass?: string;
}

/** 메인 카드 / 예선 카드 / 얼리 예선으로 그룹화된 이벤트 전체 fight card */
export interface UfcFightCard {
  mainCard: UfcEventFight[];
  prelimCard: UfcEventFight[];
  earlyPrelimCard?: UfcEventFight[];
}

/**
 * 카드별 시작 시각 (ISO 8601 UTC).
 * KST 변환은 클라이언트에서 `toLocaleString({ timeZone: "Asia/Seoul" })`로 처리.
 */
export interface UfcCardTimes {
  main?: string;
  prelim?: string;
  earlyPrelim?: string;
}

/** UFC 이벤트 단건 */
export interface UfcEvent {
  /** CloudFront 이벤트명을 slug 변환한 고유 ID */
  id: string;
  name: string;
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** 한/영 개최지 */
  location: { ko: string; en: string };
  venue?: string;
  mainEvent: UfcEventFight;
  coMainEvent?: UfcEventFight;
  /** 이벤트 상세 페이지에서 크롤한 전체 카드. 크롤 실패 시 미설정 */
  fightCard?: UfcFightCard;
  /** 카드별 시작 시각 (ISO 8601 UTC). 크롤 실패 시 미설정 */
  cardTimes?: UfcCardTimes;
}

/** Gemini AI가 생성한 메인 이벤트 승부 예측 */
export interface EventPrediction {
  /** 대응하는 UfcEvent.id */
  eventId: string;
  eventName: string;
  fighter1: string;
  fighter2: string;
  /** 예측 승자 (한/영) */
  winner: { ko: string; en: string };
  /** 예측 승자 헤드샷 URL (선택) */
  winnerImageUrl?: string;
  /** 승자 기준 승률 (50~100) */
  winProbability: number;
  /** 결과 방식 KO·TKO / 제출기술 / 판정 (한/영) */
  method: { ko: string; en: string };
  /** 경기 분석 텍스트 (한/영) */
  analysis: { ko: string; en: string };
  generatedAt: string;
}

/** Supabase ufc_schedule 테이블에 저장되는 최상위 데이터 구조 */
export interface UfcSchedule {
  updatedAt: string;
  events: UfcEvent[];
  predictions: EventPrediction[];
}
