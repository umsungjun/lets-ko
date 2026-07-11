import type { FightHistoryEntry, FighterStats } from "@/types/fighter";
import type {
  FightMatrixCandidate,
  OpponentAnalysis,
  SelectedOpponent,
} from "@/types/prediction";
import type { EventPrediction } from "@/types/schedule";

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: { temperature: 0.7 },
});

/**
 * @description 최근 전적으로 현재 모멘텀(연승/연패) 문구 생성. 매치메이킹 "위너 vs 위너" 규칙 반영용
 * @param history - 최근 경기가 먼저 오도록 정렬된 전적 목록
 * @returns 영문 모멘텀 서술 (예: "on a 2-fight win streak")
 */
const describeMomentum = (history: FightHistoryEntry[]): string => {
  if (!history?.length) return "recent form unknown";
  const latest = history[0].result;
  let count = 0;
  for (const f of history) {
    if (f.result === latest) count++;
    else break;
  }
  if (latest === "win") return `on a ${count}-fight win streak`;
  if (latest === "loss")
    return count === 1
      ? "coming off a loss"
      : `on a ${count}-fight losing skid`;
  return latest === "draw" ? "coming off a draw" : "coming off a no-contest";
};

/**
 * 호출 1: FightMatrix 후보 풀에서 3명의 상대를 선정
 */
export async function selectOpponents(
  koStats: FighterStats,
  koRank: number,
  candidates: FightMatrixCandidate[]
): Promise<SelectedOpponent[]> {
  const candidateList = candidates
    .map((c) => `- ${c.name} (Rank #${c.rank})`)
    .join("\n");

  const recentFights = koStats.fightHistory
    .slice(0, 5)
    .map(
      (f) => `${f.opponent}: ${f.result} by ${f.method} (R${f.round} ${f.time})`
    )
    .join("\n");

  // 현재 모멘텀 — 매치메이킹 "위너 vs 위너" 규칙의 핵심 입력
  const momentum = describeMomentum(koStats.fightHistory);
  // 비슷한 레벨끼리 붙는 현실 반영: 상·하위 양방향 ±15 (낮은 숫자 = 상위)
  const rankHigh = Math.max(1, koRank - 15);
  const rankLow = koRank + 15;

  const prompt = `You are a UFC matchmaker. Predict the 3 most likely NEXT opponents the UFC would realistically book for welterweight Ko Seokhyeon (고석현).

## Ko Seokhyeon's Profile
- FightMatrix Welterweight Rank: #${koRank}
- Record: ${koStats.record.wins}-${koStats.record.losses}-${koStats.record.draws}
- Current momentum: ${momentum}
- Knockouts: ${koStats.knockouts}
- Strike Accuracy: ${koStats.strikeAccuracy}%
- Takedown Accuracy: ${koStats.takedownAccuracy}%
- Height: ${koStats.height}, Weight: ${koStats.weight}, Reach: ${koStats.reach}
- Fighting base: Judo/Sambo — grappling-heavy with knockout power
- Recent fights (most recent first):
${recentFights}

## How UFC Matchmaking Actually Works — apply in THIS priority order
1. **Comparable level**: book opponents within ~15 ranking spots either side of Ko (target #${rankHigh} to #${rankLow}). Fighters climb via gradual step-ups, NOT sudden jumps to elite/top-10 contenders. A rising prospect's realistic next fight is a similar-level peer or a small step up, not a champion.
2. **Momentum matching**: the UFC pairs winners with winners and losers with losers. Ko is ${momentum}, so prioritize opponents on a similar trajectory (comparable recent form) and AVOID fighters on 2+ consecutive losses.
3. **Activity & availability**: only currently-active UFC welterweights who fought within roughly the last 12 months — not retired, injured/suspended, or already booked for another fight.
4. **Style & narrative appeal**: favor matchups the UFC and fans would push — compelling style clashes, existing callouts/rivalries, and regional draws (e.g. cards in Asia featuring Korean/Asian fighters). Given Ko's grappling-heavy base a strong wrestler is a plausible test, but DO NOT restrict to wrestlers — strikers or well-rounded fighters who make a competitive, marketable matchup qualify equally.
5. **Exclusions**: never pick Ko's teammates/training partners or anyone he has already faced.

Weight these together to output the 3 MOST REALISTIC bookings — the fights the UFC would actually make — not merely the highest-ranked names.

## Candidate Pool
${candidateList.length > 0 ? `FightMatrix Welterweight rankings near Ko (#${rankHigh}–#${rankLow}, reference):\n${candidateList}\n\nUse this as the primary pool, but you may add fighters from your own knowledge if they fit the criteria better.` : `Use your knowledge of active UFC welterweight fighters ranked roughly #${rankHigh} to #${rankLow} on FightMatrix or equivalent ranking systems.`}

Select exactly 3 opponents. For each, provide detailed info.

IMPORTANT:
- Provide all text fields in both Korean (ko) and English (en).
- Use METRIC units: height in cm (e.g. "180.3cm"), weight in kg (e.g. "77.1kg"), reach in cm (e.g. "185cm").
- Include lastFightDate (YYYY-MM-DD) if you know the opponent's most recent fight date.
- In matchReasoning, justify WHY this specific booking makes sense (level, momentum, style/narrative).`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, description: "English name" },
            nameKo: {
              type: SchemaType.STRING,
              description: "Korean name (한국어)",
            },
            rank: { type: SchemaType.NUMBER },
            fightingStyle: {
              type: SchemaType.OBJECT,
              properties: {
                ko: { type: SchemaType.STRING },
                en: { type: SchemaType.STRING },
              },
              required: ["ko", "en"],
            },
            record: {
              type: SchemaType.OBJECT,
              properties: {
                wins: { type: SchemaType.NUMBER },
                losses: { type: SchemaType.NUMBER },
                draws: { type: SchemaType.NUMBER },
              },
              required: ["wins", "losses", "draws"],
            },
            age: { type: SchemaType.NUMBER },
            height: { type: SchemaType.STRING },
            weight: { type: SchemaType.STRING },
            reach: { type: SchemaType.STRING },
            country: { type: SchemaType.STRING },
            lastFightDate: {
              type: SchemaType.STRING,
              description: "Date of most recent fight (YYYY-MM-DD format)",
            },
            matchReasoning: {
              type: SchemaType.OBJECT,
              properties: {
                ko: { type: SchemaType.STRING },
                en: { type: SchemaType.STRING },
              },
              required: ["ko", "en"],
            },
          },
          required: [
            "name",
            "nameKo",
            "rank",
            "fightingStyle",
            "record",
            "age",
            "height",
            "weight",
            "reach",
            "country",
            "lastFightDate",
            "matchReasoning",
          ],
        },
      },
    },
  });

  const text = result.response.text();
  const parsed = JSON.parse(text) as SelectedOpponent[];

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Gemini returned empty opponent selection");
  }

  return parsed.slice(0, 3);
}

/**
 * 호출 2~4: 개별 상대에 대한 상세 승부 분석
 */
export async function analyzeOpponent(
  koStats: FighterStats,
  koRank: number,
  opponent: SelectedOpponent
): Promise<OpponentAnalysis> {
  const prompt = `You are a UFC fight analyst. Provide a detailed fight analysis for:

## Ko Seokhyeon (고석현) vs ${opponent.name} (${opponent.nameKo})

### Ko Seokhyeon
- Record: ${koStats.record.wins}-${koStats.record.losses}-${koStats.record.draws}
- FightMatrix Rank: #${koRank}
- Knockouts: ${koStats.knockouts}
- Strike Accuracy: ${koStats.strikeAccuracy}%, Takedown Accuracy: ${koStats.takedownAccuracy}%
- Height: ${koStats.height}, Weight: ${koStats.weight}, Reach: ${koStats.reach}
- Base: Judo/Sambo — powerful grappling, heavy hands, pressure fighter

### ${opponent.name}
- Record: ${opponent.record.wins}-${opponent.record.losses}-${opponent.record.draws}
- FightMatrix Rank: #${opponent.rank}
- Style: ${opponent.fightingStyle.en}
- Height: ${opponent.height}, Weight: ${opponent.weight}, Reach: ${opponent.reach}
- Age: ${opponent.age}, Country: ${opponent.country}

Analyze:
1. Win probability for Ko Seokhyeon (0-100)
2. Detailed fight analysis covering striking, grappling, cardio, and likely fight outcome

IMPORTANT: Provide fightAnalysis in both Korean and English. Be specific about techniques, game plans, and key moments that could decide the fight. Write 3-4 sentences per language.`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          winProbability: {
            type: SchemaType.NUMBER,
            description: "Ko Seokhyeon win probability (0-100)",
          },
          fightAnalysis: {
            type: SchemaType.OBJECT,
            properties: {
              ko: { type: SchemaType.STRING },
              en: { type: SchemaType.STRING },
            },
            required: ["ko", "en"],
          },
        },
        required: ["winProbability", "fightAnalysis"],
      },
    },
  });

  const text = result.response.text();
  const parsed = JSON.parse(text) as OpponentAnalysis;

  if (typeof parsed.winProbability !== "number") {
    throw new Error("Invalid analysis response from Gemini");
  }

  // 승률을 0-100 범위로 제한
  parsed.winProbability = Math.max(0, Math.min(100, parsed.winProbability));

  return parsed;
}

/**
 * @description 고석현의 확정된 다음 상대에 대한 부가정보(한국어명·국적·스타일·신체 스펙) 보강.
 * 확정 경기 카드의 Tale of the Tape 비교는 상대의 나이·신장·체중·리치까지 요구하는데 UFC 일정 크롤에는 없어 Gemini로 보완.
 * @param nameEn - 상대 영문 이름 (UFC 일정 표기 그대로)
 * @param record - 상대 전적 문자열 (예: "22-7-0", 선택). 크롤에 없으면 Gemini 응답의 record가 폴백으로 쓰임
 * @returns 한국어명·국적(영문)·파이팅 스타일(한/영)·나이·신장/체중/리치(메트릭)·전적
 * @throws Gemini 응답이 유효하지 않을 때
 */
export async function analyzeConfirmedOpponent(
  nameEn: string,
  record?: string
): Promise<{
  nameKo: string;
  country: string;
  fightingStyle: { ko: string; en: string };
  age: number;
  height: string;
  weight: string;
  reach: string;
  record: string;
}> {
  const prompt = `The UFC fighter "${nameEn}"${record ? ` (record ${record})` : ""} is Ko Seokhyeon's confirmed next opponent. Based on your knowledge of this fighter, provide:
1. nameKo: Korean phonetic transliteration of the fighter's name (한국어)
2. country: the fighter's country in English (e.g. "USA", "Brazil", "Russia")
3. fightingStyle: a short 2-4 word description of their fighting style, in both Korean and English
4. age: the fighter's current age (number)
5. height / weight / reach: in METRIC units — height in cm (e.g. "182.9cm"), weight in kg (e.g. "77.1kg"), reach in cm (e.g. "188cm")
6. record: professional MMA record as "W-L-D" (e.g. "22-7-0")${record ? ` — the given record above is authoritative, repeat it` : ""}

If you are unsure about the fighter, give a reasonable best-effort answer (do not leave fields empty).`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          nameKo: { type: SchemaType.STRING },
          country: { type: SchemaType.STRING },
          fightingStyle: {
            type: SchemaType.OBJECT,
            properties: {
              ko: { type: SchemaType.STRING },
              en: { type: SchemaType.STRING },
            },
            required: ["ko", "en"],
          },
          age: { type: SchemaType.NUMBER },
          height: {
            type: SchemaType.STRING,
            description: 'Height in cm, e.g. "182.9cm"',
          },
          weight: {
            type: SchemaType.STRING,
            description: 'Weight in kg, e.g. "77.1kg"',
          },
          reach: {
            type: SchemaType.STRING,
            description: 'Reach in cm, e.g. "188cm"',
          },
          record: {
            type: SchemaType.STRING,
            description: 'MMA record "W-L-D", e.g. "22-7-0"',
          },
        },
        required: [
          "nameKo",
          "country",
          "fightingStyle",
          "age",
          "height",
          "weight",
          "reach",
          "record",
        ],
      },
    },
  });

  const parsed = JSON.parse(result.response.text()) as {
    nameKo: string;
    country: string;
    fightingStyle: { ko: string; en: string };
    age: number;
    height: string;
    weight: string;
    reach: string;
    record: string;
  };

  if (!parsed.nameKo || !parsed.fightingStyle) {
    throw new Error("Invalid confirmed opponent response from Gemini");
  }

  return parsed;
}

/**
 * UFC 이벤트 메인 매치 승부 예측 생성
 */
export async function analyzeMainEvent(
  fighter1Name: string,
  fighter2Name: string,
  eventName: string,
  weightClass?: string
): Promise<
  Pick<EventPrediction, "winner" | "winProbability" | "method" | "analysis">
> {
  const prompt = `You are a UFC fight analyst. Analyze the upcoming main event:

## ${eventName}
${fighter1Name} vs ${fighter2Name}
${weightClass ? `Weight Class: ${weightClass}` : ""}

Provide:
1. Predicted winner (spell the name exactly as given above)
2. Win probability for the predicted winner (50-100, since it's the winner)
3. Likely method of victory
4. Fight analysis covering striking, grappling, cardio, likely game plan, and key deciding factors

IMPORTANT:
- winner.en: English name (exact spelling as given)
- winner.ko: Korean phonetic transliteration of the winner's name
- method.ko: use "KO/TKO", "제출기술", or "판정" depending on prediction
- method.en: use "KO/TKO", "Submission", or "Decision"
- analysis.ko and analysis.en: 3-4 sentences each, specific about techniques and game plans
- winProbability is for the WINNER (always 50-100)`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          winner: {
            type: SchemaType.OBJECT,
            properties: {
              ko: { type: SchemaType.STRING },
              en: { type: SchemaType.STRING },
            },
            required: ["ko", "en"],
          },
          winProbability: {
            type: SchemaType.NUMBER,
            description: "Winner's win probability (50-100)",
          },
          method: {
            type: SchemaType.OBJECT,
            properties: {
              ko: { type: SchemaType.STRING },
              en: { type: SchemaType.STRING },
            },
            required: ["ko", "en"],
          },
          analysis: {
            type: SchemaType.OBJECT,
            properties: {
              ko: { type: SchemaType.STRING },
              en: { type: SchemaType.STRING },
            },
            required: ["ko", "en"],
          },
        },
        required: ["winner", "winProbability", "method", "analysis"],
      },
    },
  });

  const text = result.response.text();
  const parsed = JSON.parse(text) as Pick<
    EventPrediction,
    "winner" | "winProbability" | "method" | "analysis"
  >;

  if (typeof parsed.winProbability !== "number") {
    throw new Error("Invalid main event analysis response from Gemini");
  }

  // 승자 기준이므로 50 이상 보장
  parsed.winProbability = Math.max(50, Math.min(100, parsed.winProbability));

  return parsed;
}
