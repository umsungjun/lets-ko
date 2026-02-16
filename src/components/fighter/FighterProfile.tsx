import { useTranslations } from "next-intl";
import Image from "next/image";

import type { FighterBio, FighterStats } from "@/types/fighter";

interface FighterProfileProps {
  bio: FighterBio;
  stats: FighterStats;
  locale: string;
}

export default function FighterProfile({
  bio,
  stats,
  locale,
}: FighterProfileProps) {
  const t = useTranslations("hero");
  const name = locale === "ko" ? bio.name.ko : bio.name.en;
  const background = locale === "ko" ? bio.background.ko : bio.background.en;
  const fightingStyle =
    locale === "ko" ? bio.fightingStyle.ko : bio.fightingStyle.en;

  const { wins, losses, draws } = stats.record;

  return (
    <section className="relative overflow-hidden bg-linear-to-b from-red-700 via-red-800 to-red-900">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center md:items-end min-h-130 md:min-h-150">
          {/* Text content */}
          <div className="flex-1 px-6 py-12 md:py-20 text-center md:text-left z-10 order-2 md:order-1 animate-fade-up">
            <p className="text-red-200 font-bold text-sm tracking-widest uppercase mb-3">
              {t("nickname")}
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white mb-3 leading-[1.1]">
              {name}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-6">
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm font-semibold border border-white/30">
                UFC {t("division")}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-sm font-mono">
                {wins}W - {losses}L - {draws}D
              </span>
            </div>

            <p className="text-red-100/80 leading-relaxed mb-8 max-w-lg text-sm md:text-base">
              {background}
            </p>

            <div className="grid grid-cols-3 gap-3 max-w-md">
              {[
                { label: t("gym"), value: bio.gym },
                { label: t("fightingStyle"), value: fightingStyle },
                { label: t("born"), value: bio.birthDate },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-white/10 rounded-xl px-3 py-3 border border-white/15"
                >
                  <p className="text-red-200/70 text-xs mb-1">{item.label}</p>
                  <p className="text-white font-semibold text-sm">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Fighter image */}
          <div className="relative w-full md:w-auto flex justify-center order-1 md:order-2 shrink-0 animate-fade-in animation-delay-300">
            <div className="relative w-70 h-87.5 sm:w-80 sm:h-100 md:w-95 md:h-125 lg:w-105 lg:h-140">
              <Image
                src="/images/ko-seokhyeon.png"
                alt={name}
                fill
                className="object-contain object-bottom drop-shadow-2xl"
                priority
                sizes="(max-width: 768px) 320px, 420px"
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-red-900 to-transparent" />
          </div>
        </div>
      </div>

      {/* Background decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-black/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-black/5 rounded-full blur-3xl" />
    </section>
  );
}
