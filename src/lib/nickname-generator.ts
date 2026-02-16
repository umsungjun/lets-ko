interface NicknameModifier {
  ko: string;
  en: string;
}

const modifiers: NicknameModifier[] = [
  { ko: "운동 많이 되는", en: "Well-Exercised" },
  { ko: "스트레스 받는", en: "Stressed-Out" },
  { ko: "배고픈", en: "Hungry" },
  { ko: "졸린", en: "Sleepy" },
  { ko: "신나는", en: "Excited" },
  { ko: "힘이 넘치는", en: "Energetic" },
  { ko: "열정적인", en: "Passionate" },
  { ko: "집중하는", en: "Focused" },
  { ko: "웃고 있는", en: "Smiling" },
  { ko: "화난", en: "Angry" },
  { ko: "행복한", en: "Happy" },
  { ko: "긴장하는", en: "Nervous" },
  { ko: "용감한", en: "Brave" },
  { ko: "무적의", en: "Invincible" },
  { ko: "귀여운", en: "Cute" },
  { ko: "멋있는", en: "Cool" },
  { ko: "카리스마 넘치는", en: "Charismatic" },
  { ko: "잠 안 오는", en: "Sleepless" },
  { ko: "커피 마시는", en: "Coffee-Drinking" },
  { ko: "삼보하는", en: "Sambo-Doing" },
  { ko: "타이슨 같은", en: "Tyson-Like" },
  { ko: "옥타곤 위의", en: "In-The-Octagon" },
  { ko: "계체량 통과한", en: "Weigh-In-Passed" },
  { ko: "치킨 먹는", en: "Chicken-Eating" },
  { ko: "훈련 끝난", en: "Done-Training" },
  { ko: "승리한", en: "Victorious" },
  { ko: "KO 시키는", en: "Knocking-Out" },
  { ko: "텐션 높은", en: "High-Energy" },
  { ko: "레전드인", en: "Legendary" },
  { ko: "설레는", en: "Thrilled" },
];

export function generateNickname(locale: string): string {
  const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
  const name = locale === "ko" ? "석현" : "Seokhyeon";
  const mod = locale === "ko" ? modifier.ko : modifier.en;
  return `${mod} ${name}`;
}
