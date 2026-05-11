/**
 * @description 파이터 이름이 미확정 상태(TBA/TBD 등)인지 판별.
 * UFC 데이터 소스마다 미확정 파이터를 "TBA", "TBD", 빈 문자열 등으로 다르게 표기하므로
 * 한 곳에서 정규화하여 AI 예측 생성·표시 분기 처리에 사용.
 * @param name - 검사할 파이터 이름
 * @returns 미확정이면 true
 */
export const isTbaFighter = (name: string | undefined): boolean => {
  if (!name) return true;
  const normalized = name.trim().toUpperCase();
  return normalized === "" || normalized === "TBA" || normalized === "TBD";
};

/**
 * @description 매치업의 두 파이터 중 하나라도 미확정인지 판별.
 * @param fighter1Name - 파이터 1 이름
 * @param fighter2Name - 파이터 2 이름
 * @returns 둘 중 하나라도 미확정이면 true
 */
export const isTbaMatchup = (
  fighter1Name: string | undefined,
  fighter2Name: string | undefined
): boolean => isTbaFighter(fighter1Name) || isTbaFighter(fighter2Name);
