export interface RankedFighter {
  rank: number;
  name: string;
  rankChange: number;
  isNR: boolean;
}

export interface DivisionRanking {
  divisionName: string;
  divisionNameEn: string;
  divisionSlug: string;
  champion: {
    name: string;
    imageUrl: string;
  } | null;
  rankedFighters: RankedFighter[];
}

export interface P4PRanking {
  topFighter: {
    name: string;
    imageUrl: string;
  } | null;
  fighters: RankedFighter[];
}

export interface UfcRankings {
  updatedAt: string;
  poundForPoundMen: P4PRanking;
  poundForPoundWomen: P4PRanking;
  divisions: DivisionRanking[];
}
