"use client";

import { useCallback, useEffect, useState } from "react";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

import type { GuestbookMessage } from "@/types/guestbook";

import { formatDistanceToNow } from "date-fns";
import { enUS, ko } from "date-fns/locale";

import GuestbookForm from "./GuestbookForm";

const PAGE_SIZE = 20;
const REACTION_EMOJIS = ["👊", "🔥", "💪", "❤️", "👏"];

function getMyReactions(): Record<string, string[]> {
  try {
    return JSON.parse(
      localStorage.getItem("guestbook_my_reactions") || "{}"
    );
  } catch {
    return {};
  }
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [myIds, setMyIds] = useState<string[]>([]);
  const [myReactions, setMyReactions] = useState<Record<string, string[]>>({});
  const [openReactionId, setOpenReactionId] = useState<string | null>(null);

  const dateLocale = locale === "ko" ? ko : enUS;

  useEffect(() => {
    setMyIds(getMyIds());
    setMyReactions(getMyReactions());
  }, []);

  const fetchMessages = useCallback(async (pageNum: number, append = false) => {
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
  }, []);

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

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch("/api/guestbook/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });
      if (!res.ok) return;
      const { count, active } = await res.json();

      // 메시지 reactions 카운트 업데이트
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, reactions: { ...m.reactions, [emoji]: count } }
            : m
        )
      );

      // localStorage 업데이트
      const updated = getMyReactions();
      const prev = updated[messageId] || [];
      updated[messageId] = active
        ? [...prev, emoji]
        : prev.filter((e) => e !== emoji);
      localStorage.setItem("guestbook_my_reactions", JSON.stringify(updated));
      setMyReactions({ ...updated });
    } catch {}
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };

  const handleDeleteCancel = () => {
    setDeletingId(null);
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      const res = await fetch("/api/guestbook", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        setDeletingId(null);
        // localStorage에서도 제거
        try {
          const ids: string[] = JSON.parse(
            localStorage.getItem("guestbook_my_ids") || "[]"
          );
          localStorage.setItem(
            "guestbook_my_ids",
            JSON.stringify(ids.filter((i) => i !== id))
          );
          setMyIds((prev) => prev.filter((i) => i !== id));
        } catch {}
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <GuestbookForm onSubmit={handleNewMessage} />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="text-2xl font-bold text-red-500 tracking-widest animate-pulse">
            ...
          </span>
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
                      <>
                        <button
                          onClick={() => handleEdit(msg)}
                          className="flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors cursor-pointer"
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          {t("edit")}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(msg.id)}
                          className="flex items-center gap-1 text-xs text-muted hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          {t("delete")}
                        </button>
                      </>
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
                        className="px-4 py-1.5 text-xs text-muted hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer"
                      >
                        {t("cancel")}
                      </button>
                      <button
                        onClick={() => handleSaveEdit(msg.id)}
                        disabled={!editText.trim() || saving}
                        className="px-4 py-1.5 text-xs text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        {saving ? t("submitting") : t("save")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-foreground leading-relaxed">
                      {msg.message}
                    </p>
                    <div className="mt-3 space-y-2">
                      {/* 1줄: 😊 토글 버튼 + 슬라이딩 이모지 피커 */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            setOpenReactionId(
                              openReactionId === msg.id ? null : msg.id
                            )
                          }
                          className={`flex items-center px-2.5 py-1 rounded-full text-xs border transition-all cursor-pointer ${
                            openReactionId === msg.id
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-surface border-border text-muted hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M8 13s1.5 2 4 2 4-2 4-2" />
                            <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
                            <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
                          </svg>
                        </button>
                        <div
                          className={`flex items-center gap-1 overflow-hidden transition-all duration-300 ease-in-out ${
                            openReactionId === msg.id
                              ? "max-w-72 opacity-100"
                              : "max-w-0 opacity-0"
                          }`}
                        >
                          {REACTION_EMOJIS.map((emoji) => {
                            const reacted = (myReactions[msg.id] || []).includes(emoji);
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg.id, emoji)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors cursor-pointer whitespace-nowrap ${
                                  reacted
                                    ? "bg-primary/10 border-primary/30 text-primary font-medium"
                                    : "bg-surface border-border text-muted hover:border-primary/40 hover:text-foreground"
                                }`}
                              >
                                <span>{emoji}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2줄: 리액션 카운트 배지 */}
                      {REACTION_EMOJIS.some((e) => (msg.reactions?.[e] || 0) > 0 || (myReactions[msg.id] || []).includes(e)) && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {REACTION_EMOJIS.map((emoji) => {
                            const count = msg.reactions?.[emoji] || 0;
                            const reacted = (myReactions[msg.id] || []).includes(emoji);
                            if (count === 0 && !reacted) return null;
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg.id, emoji)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all cursor-pointer ${
                                  reacted
                                    ? "bg-primary/10 border-primary/30 text-primary font-medium"
                                    : "bg-surface border-border text-muted hover:border-primary/40 hover:text-foreground"
                                }`}
                              >
                                <span>{emoji}</span>
                                {count > 0 && <span>{count}</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
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

      {/* 삭제 확인 모달 */}
      {deletingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={handleDeleteCancel}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <p className="font-bold text-base text-foreground">
                {t("deleteModalTitle")}
              </p>
              <p className="text-sm text-muted">{t("deleteModalDesc")}</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 py-2.5 text-sm font-medium text-muted hover:text-foreground border border-border rounded-xl transition-colors cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => handleDeleteConfirm(deletingId)}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer"
              >
                {t("deleteConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
