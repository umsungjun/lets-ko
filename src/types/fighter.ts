export interface ExternalRanking {
  site: string;
  rank: number;
  total?: number;
  division: string;
  url: string;
}

export interface FighterStats {
  record: {
    wins: number;
    losses: number;
    draws: number;
  };
  knockouts: number;
  strikeAccuracy: number;
  strikesLandedPerMin: number;
  strikeDefense: number;
  takedownAccuracy: number;
  takedownDefense: number;
  height: string;
  weight: string;
  reach: string;
  fightHistory: FightHistoryEntry[];
  externalRankings?: ExternalRanking[];
}

export interface FightHistoryEntry {
  date: string;
  event: string;
  opponent: string;
  result: "win" | "loss" | "draw" | "nc";
  method: string;
  round: number;
  time: string;
}

export interface FighterBio {
  name: { ko: string; en: string };
  nickname: string;
  birthDate: string;
  hometown: { ko: string; en: string };
  gym: string;
  fightingStyle: { ko: string; en: string };
  background: { ko: string; en: string };
  instagramUrl: string;
}

export interface CareerHighlight {
  year: number;
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  category: "achievement" | "fight" | "title" | "debut";
}
