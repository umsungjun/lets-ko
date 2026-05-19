# Copilot Instructions

## 응답 언어

- 모든 코드 리뷰 코멘트, 제안, 설명은 **한국어**로 작성해주세요.
- 기술 용어는 한국어를 우선 사용하고, 의미 명확화가 필요한 경우 영어 원문을 괄호로 병기해주세요 (예: "타입 안정성(type safety)", "사이드 이펙트(side effect)").
- 코드 블록 내 주석도 한국어로 작성해주세요.

## 프로젝트 컨텍스트

- **LET'S KO** — UFC 파이터 고석현 팬 응원 사이트
- 스택: Next.js 16 App Router, TypeScript, Tailwind CSS v4, Supabase, next-intl (ko/en)
- 자세한 아키텍처·컨벤션은 루트 `CLAUDE.md` 참조

## 리뷰 시 중점 사항

- **타입 안전성**: `interface`(외부 계약) vs `type`(내부 조합) 컨벤션 준수 여부
- **컴포넌트 작성 패턴**: 뷰 컴포넌트는 `export default function`, 유틸·훅·핸들러는 화살표 함수
- **JSDoc**: 새 컴포넌트·유틸 함수에 한국어 JSDoc 작성 여부 (`@description`, `@param`, `@returns`)
- **i18n**: 사용자 노출 문자열이 `src/messages/{ko,en}.json`을 통해 처리되는지
- **데이터 흐름**: Supabase 우선 → 캐시 JSON 폴백 패턴 준수
- **보안**: `.env`·시크릿 노출, SQL 인젝션, XSS 등 OWASP 항목
- **중복 코드**: 공통 컴포넌트·훅으로 분리 가능한 패턴 식별
- **ISR/캐시**: `revalidate` 설정과 `revalidatePath()` 호출 누락 여부
