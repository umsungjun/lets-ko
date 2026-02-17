import "./globals.css";

import type { Metadata } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://lets-ko.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LET'S KO - 고석현 응원 사이트",
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
  authors: [{ name: "LET'S KO" }],
  openGraph: {
    type: "website",
    siteName: "LET'S KO",
    title: "LET'S KO - 고석현 응원 사이트",
    description:
      "UFC 웰터급 파이터 고석현(The Korean Tyson) 선수의 전적, 경기 기록, 하이라이트 영상, 응원 메시지",
    locale: "ko_KR",
    alternateLocale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "LET'S KO - 고석현 응원 사이트",
    description:
      "UFC 웰터급 파이터 고석현(The Korean Tyson) 선수의 비공식 팬 응원 사이트",
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
    canonical: SITE_URL,
    languages: {
      ko: `${SITE_URL}/ko`,
      en: `${SITE_URL}/en`,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
