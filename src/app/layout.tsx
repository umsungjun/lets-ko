import "./globals.css";

import type { Metadata } from "next";

import { SITE_ORIGIN } from "@/lib/seo/site-url";

// 페이지별 title·description·OG는 각 generateMetadata가 buildPageMetadata로 만든다. 여기에 한국어 OG를 두면 이를 재정의하지 않는 en 페이지가 그대로 상속한다.
export const metadata: Metadata = {
  // 상대 경로 alternates가 절대 URL로 변환되도록 metadataBase 설정
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: "고석현 | LET'S KO",
    template: "%s | LET'S KO",
  },
  authors: [{ name: "umsungjun" }],
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
