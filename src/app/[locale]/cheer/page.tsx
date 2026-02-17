import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import GuestbookList from "@/components/guestbook/GuestbookList";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  return {
    title: isKo ? "고석현 선수 응원하기" : "Cheer for Ko Seokhyeon",
    description: isKo
      ? "UFC 웰터급 파이터 고석현 선수에게 응원 메시지를 남겨주세요. 익명으로 자유롭게 응원할 수 있습니다."
      : "Leave a cheer message for UFC welterweight fighter Ko Seokhyeon. Anonymous messages welcome!",
    alternates: {
      canonical: `/${locale}/cheer`,
      languages: { ko: "/ko/cheer", en: "/en/cheer" },
    },
  };
}

export default async function CheerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("guestbook");

  return (
    <section className="py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-2xl font-black text-primary mb-3 tracking-tight">
            UFC
          </p>
          <h1 className="text-2xl font-black tracking-tight mb-2">
            {t("title")}
          </h1>
          <p className="text-muted text-sm">{t("subtitle")}</p>
        </div>

        <GuestbookList />
      </div>
    </section>
  );
}
