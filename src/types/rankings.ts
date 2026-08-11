import type { LocalizableFighterName } from "@/lib/fighter-name-utils";

export interface RankedFighter extends LocalizableFighterName {
  rank: number;
  rankChange: number;
  isNR: boolean;
}

export interface DivisionRanking {
  divisionName: string;
  divisionNameEn: string;
  divisionSlug: string;
  champion: (LocalizableFighterName & { imageUrl: string }) | null;
  rankedFighters: RankedFighter[];
}

export interface P4PRanking {
  topFighter: (LocalizableFighterName & { imageUrl: string }) | null;
  fighters: RankedFighter[];
}

export interface UfcRankings {
  updatedAt: string;
  poundForPoundMen: P4PRanking;
  poundForPoundWomen: P4PRanking;
  divisions: DivisionRanking[];
}
