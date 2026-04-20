import type { FighterStats } from "@/types/fighter";
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

  const prompt = `You are a UFC matchmaking analyst. Predict the 3 most likely next opponents for UFC welterweight fighter Ko Seokhyeon (고석현).

## Ko Seokhyeon's Profile
- FightMatrix Welterweight Rank: #${koRank}
- Record: ${koStats.record.wins}-${koStats.record.losses}-${koStats.record.draws}
- Knockouts: ${koStats.knockouts}
- Strike Accuracy: ${koStats.strikeAccuracy}%
- Takedown Accuracy: ${koStats.takedownAccuracy}%
- Height: ${koStats.height}, Weight: ${koStats.weight}, Reach: ${koStats.reach}
- Fighting base: Judo/Sambo with strong grappling and striking power
- Recent fights:
${recentFights}

## Key Context for Matchmaking
- Ko has dominated strikers and BJJ-based fighters in his UFC career with decisive victories
- UFC matchmakers are likely to test him against a WRESTLER or wrestling-based fighter next
- **IMPORTANT: Select opponents ranked ABOVE Ko (higher ranked = lower rank number). Target range: #${Math.max(1, koRank - 20)} to #${koRank - 1} on FightMatrix or equivalent rankings**
- Prefer fighters who are currently active in the UFC and not coming off 3+ consecutive losses
- Consider recent activity, availability, and stylistic matchup interest

## Candidate Pool
${candidateList.length > 0 ? `FightMatrix Welterweight Rankings (reference):\n${candidateList}\n\nUse this list as a reference, but you may also select fighters from your own knowledge if they fit the criteria better.` : `Use your knowledge of active UFC welterweight fighters ranked ABOVE Ko Seokhyeon (ranks #${Math.max(1, koRank - 20)} to #${koRank - 1} on FightMatrix or equivalent ranking systems).`}

Select exactly 3 opponents. For each, provide detailed info.

IMPORTANT:
- Provide all text fields in both Korean (ko) and English (en).
- Use METRIC units: height in cm (e.g. "180.3cm"), weight in kg (e.g. "77.1kg"), reach in cm (e.g. "185cm").
- Include lastFightDate (YYYY-MM-DD) if you know the opponent's most recent fight date.`;

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
