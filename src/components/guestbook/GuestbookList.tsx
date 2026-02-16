"use client";

import { useCallback, useEffect, useState } from "react";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

import type { GuestbookMessage } from "@/types/guestbook";

import { formatDistanceToNow } from "date-fns";
import { enUS, ko } from "date-fns/locale";

import GuestbookForm from "./GuestbookForm";

const PAGE_SIZE = 20;

function getMyIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem("guestbook_my_ids") || "[]");
  } catch {
    return [];
  }
}

export default function GuestbookList() {
  const t = useTranslations("guestbook");
  const locale = useLocale();
  const [messages, setMessages] = useState<GuestbookMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [myIds, setMyIds] = useState<string[]>([]);

  const dateLocale = locale === "ko" ? ko : enUS;

  useEffect(() => {
    setMyIds(getMyIds());
  }, []);

  const fetchMessages = useCallback(
    async (pageNum: number, append = false) => {
      try {
        const res = await fetch(
          `/api/guestbook?page=${pageNum}&limit=${PAGE_SIZE}`
        );
        if (res.ok) {
          const data = await res.json();
          setMessages((prev) =>
            append ? [...prev, ...data.messages] : data.messages
          );
          setHasMore(data.hasMore);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchMessages(1);
  }, [fetchMessages]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMessages(nextPage, true);
  };

  const handleNewMessage = () => {
    setPage(1);
    fetchMessages(1);
    setMyIds(getMyIds());
  };

  const handleEdit = (msg: GuestbookMessage) => {
    setEditingId(msg.id);
    setEditText(msg.message);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/guestbook", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, message: editText.trim() }),
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, message: editText.trim() } : m
          )
        );
        setEditingId(null);
        setEditText("");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white border border-border shadow-card animate-pulse h-24"
            />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-muted text-sm">{t("noMessages")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => {
            const isMine = myIds.includes(msg.id);
            const isEditing = editingId === msg.id;

            return (
              <div
                key={msg.id}
                className="p-5 rounded-2xl bg-white border border-border shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-primary">
                    {msg.nickname}
                  </span>
                  <div className="flex items-center gap-2">
                    {isMine && !isEditing && (
                      <button
                        onClick={() => handleEdit(msg)}
                        className="text-xs text-muted hover:text-primary transition-colors"
                      >
                        {t("edit")}
                      </button>
                    )}
                    <span className="text-xs text-muted">
                      {formatDistanceToNow(new Date(msg.created_at), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </span>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      maxLength={500}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-1.5 text-xs text-muted hover:text-foreground border border-border rounded-lg transition-colors"
                      >
                        {t("cancel")}
                      </button>
                      <button
                        onClick={() => handleSaveEdit(msg.id)}
                        disabled={!editText.trim() || saving}
                        className="px-4 py-1.5 text-xs text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-40"
                      >
                        {saving ? t("submitting") : t("save")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground leading-relaxed">
                    {msg.message}
                  </p>
                )}
              </div>
            );
          })}

          {hasMore && (
            <button
              onClick={handleLoadMore}
              className="w-full py-3 text-sm font-medium text-muted hover:text-primary bg-white border border-border rounded-2xl hover:border-primary shadow-card hover:shadow-card-hover transition-all"
            >
              {t("loadMore")}
            </button>
          )}
        </div>
      )}

      <GuestbookForm onSubmit={handleNewMessage} />
    </div>
  );
}
