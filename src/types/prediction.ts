export interface OpponentPrediction {
  name: { ko: string; en: string };
  imageUrl: string;
  country: string;
  fightMatrixRank: number;
  fightingStyle: { ko: string; en: string };
  record: { wins: number; losses: number; draws: number };
  age: number;
  height: string;
  weight: string;
  reach: string;
  lastFightDate?: string;
  winProbability: number;
  matchReasoning: { ko: string; en: string };
  fightAnalysis: { ko: string; en: string };
}

// 확정된 다음 경기 정보
export interface ConfirmedFight {
  opponent: {
    name: { ko: string; en: string };
    imageUrl: string;
    country: string;
    record: { wins: number; losses: number; draws: number };
    fightingStyle: { ko: string; en: string };
    /** 나이 (Gemini 보강값, 구버전 데이터엔 없을 수 있음) */
    age?: number;
    /** 신장, 메트릭 표기 (예: "183cm") */
    height?: string;
    /** 체중, 메트릭 표기 (예: "77.1kg") */
    weight?: string;
    /** 리치, 메트릭 표기 (예: "183cm") */
    reach?: string;
  };
  date: string; // ISO date (e.g. "2026-06-21")
  location: { ko: string; en: string };
  event: string; // e.g. "UFC Fight Night 280"
}

export interface PredictionData {
  generatedAt: string;
  koFightMatrixRank: number;
  // 확정된 경기가 있으면 예측 대신 이것을 표시
  confirmedFight?: ConfirmedFight;
  // 최근 경기 후 최소 기간(일) 미충족 시 예측 비활성
  lastFightDate?: string;
  opponents: OpponentPrediction[];
}

// Gemini 호출 1: 후보 선정 응답
export interface SelectedOpponent {
  name: string;
  nameKo: string;
  rank: number;
  fightingStyle: { ko: string; en: string };
  record: { wins: number; losses: number; draws: number };
  age: number;
  height: string;
  weight: string;
  reach: string;
  country: string;
  lastFightDate?: string;
  matchReasoning: { ko: string; en: string };
}

// Gemini 호출 2~4: 상세 분석 응답
export interface OpponentAnalysis {
  winProbability: number;
  fightAnalysis: { ko: string; en: string };
}

// FightMatrix 크롤링 후보
export interface FightMatrixCandidate {
  name: string;
  rank: number;
  profileUrl: string;
}
