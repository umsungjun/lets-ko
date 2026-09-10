import type { Metadata } from "next";

import { SITE_ORIGIN, localePath, localeUrl } from "./site-url";

const OG_IMAGE = {
  url: `${SITE_ORIGIN}/og.png`,
  width: 1200,
  height: 630,
  alt: "LET'S KO - 고석현 응원",
};

export interface PageMetaInput {
  /** "ko" | "en" */
  locale: string;
  /** locale prefix 없는 경로 ("" 또는 "/schedule") */
  path: string;
  /** 페이지 고유 제목. 루트 template이 " | LET'S KO"를 붙이므로 접미사를 넣지 않는다 */
  title: string;
  /** 페이지 고유 설명 */
  description: string;
  /** 페이지 고유 키워드. 없으면 생략 */
  keywords?: string[];
}

/**
 * @description 페이지 metadata를 로케일에 맞게 생성. canonical·hreflang·OG·Twitter를 한 곳에서 만들어 en 페이지가 루트의 한국어 OG를 상속하는 문제를 막는다.
 * @param input.locale - "ko" | "en"
 * @param input.path - locale prefix 없는 경로
 * @param input.title - 페이지 고유 제목
 * @param input.description - 페이지 고유 설명
 * @param input.keywords - 페이지 고유 키워드 (선택)
 * @returns Next.js Metadata 객체
 */
export const buildPageMetadata = ({
  locale,
  path,
  title,
  description,
  keywords,
}: PageMetaInput): Metadata => {
  const isKo = locale === "ko";

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: {
      canonical: localePath(locale, path),
      languages: {
        ko: localePath("ko", path),
        en: localePath("en", path),
        "x-default": localePath("ko", path),
      },
    },
    openGraph: {
      type: "website",
      siteName: "LET'S KO",
      title,
      description,
      url: localeUrl(locale, path),
      locale: isKo ? "ko_KR" : "en_US",
      alternateLocale: isKo ? "en_US" : "ko_KR",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
};
