import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Script from "next/script";

import AppToaster from "@/components/common/AppToaster";
import DevTools from "@/components/dev/DevTools";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

import { routing } from "../../../i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "ko" | "en")) {
    notFound();
  }

  setRequestLocale(locale);

  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    notFound();
  }

  return (
    // globals.css의 scroll-behavior: smooth가 라우트 전환 스크롤까지 부드럽게 만들지 않도록 Next에 알린다.
    <html lang={locale} data-scroll-behavior="smooth">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body
        className="min-h-screen flex flex-col antialiased"
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <AppToaster />
          {process.env.NODE_ENV === "development" && <DevTools />}
        </NextIntlClientProvider>
        {/* Microsoft Clarity. 날 <script>는 로케일 전환으로 레이아웃이 클라이언트에서 다시 그려질 때 React가 에러를 내므로 next/script로 한 번만 주입한다. */}
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","vkw0n969lk");`}
        </Script>
      </body>
    </html>
  );
}
