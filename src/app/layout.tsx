import "./globals.css";

import type { Metadata } from "next";

// path 없이 origin만 사용 (NEXT_PUBLIC_SITE_URL에 /ko 등 path가 포함되어 있어도 안전)
const SITE_URL = (() => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://lets-ko.vercel.app";
  try {
    return new URL(raw).origin;
  } catch {
    return "https://lets-ko.vercel.app";
  }
})();

export const metadata: Metadata = {
  // 상대 경로 alternates가 절대 URL로 변환되도록 metadataBase 설정
  metadataBase: new URL(SITE_URL),
  title: {
    default: "고석현 | LET'S KO",
    template: "%s | LET'S KO",
  },
  description:
    "UFC 웰터급 파이터 고석현(The Korean Tyson) 선수의 비공식 팬 응원 사이트. 전적, 경기 기록, 하이라이트 영상, 응원 메시지를 확인하세요.",
  keywords: [
    "고석현",
    "Ko Seokhyeon",
    "UFC",
    "코리안 타이슨",
    "The Korean Tyson",
    "UFC 웰터급",
    "MMA",
    "종합격투기",
    "고석현 전적",
    "고석현 UFC",
    "고석현 경기",
    "HAVAS MMA",
    "한국 UFC 선수",
  ],
  authors: [{ name: "umsungjun" }],
  openGraph: {
    type: "website",
    siteName: "LET'S KO",
    title: "고석현 | LET'S KO",
    description:
      "UFC 웰터급 파이터 고석현(The Korean Tyson) 선수의 비공식 팬 응원 사이트. 전적, 경기 기록, 하이라이트 영상, 응원 메시지를 확인하세요.",
    locale: "ko_KR",
    alternateLocale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "고석현 | LET'S KO",
    description:
      "UFC 웰터급 파이터 고석현(The Korean Tyson) 선수의 비공식 팬 응원 사이트. 전적, 경기 기록, 하이라이트 영상, 응원 메시지를 확인하세요.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    // 루트(/)는 /ko로 리다이렉트되므로 canonical을 기본 로케일로 지정
    canonical: `${SITE_URL}/ko`,
    languages: {
      ko: `${SITE_URL}/ko`,
      en: `${SITE_URL}/en`,
      "x-default": `${SITE_URL}/ko`,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: {
      "naver-site-verification": "ad18a7dc71d1d32805179c7a463795189da8cfd4",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
