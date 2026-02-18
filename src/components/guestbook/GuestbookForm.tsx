"use client";

import { useCallback, useState } from "react";

import { useLocale, useTranslations } from "next-intl";

import { generateNickname } from "@/lib/nickname-generator";

interface GuestbookFormProps {
  onSubmit: () => void;
}

export default function GuestbookForm({ onSubmit }: GuestbookFormProps) {
  const t = useTranslations("guestbook");
  const locale = useLocale();
  const [nickname, setNickname] = useState(() => generateNickname(locale));
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const shuffleNickname = useCallback(() => {
    setNickname(generateNickname(locale));
  }, [locale]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!message.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim() || generateNickname(locale),
          message: message.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message?.id) {
          const myIds: string[] = JSON.parse(
            localStorage.getItem("guestbook_my_ids") || "[]"
          );
          myIds.push(data.message.id);
          localStorage.setItem("guestbook_my_ids", JSON.stringify(myIds));
        }
        setMessage("");
        shuffleNickname();
        onSubmit();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 rounded-2xl bg-white border border-border shadow-card space-y-4"
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t("nicknamePlaceholder")}
          maxLength={50}
          className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
        <button
          type="button"
          onClick={shuffleNickname}
          className="px-3 py-2.5 rounded-xl border border-border bg-surface text-muted hover:text-primary hover:border-primary transition-colors text-sm shrink-0 cursor-pointer"
          title={t("shuffleNickname")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
        </button>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t("messagePlaceholder")}
        maxLength={500}
        rows={3}
        className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{message.length}/500</span>
        <button
          type="submit"
          disabled={!message.trim() || submitting}
          className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-sm shadow-card"
        >
          {submitting ? t("submitting") : t("submit")}
        </button>
      </div>
    </form>
  );
}
