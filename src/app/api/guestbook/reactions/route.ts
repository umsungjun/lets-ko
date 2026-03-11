import { NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

import { createHash } from "crypto";

const ALLOWED_EMOJIS = ["👊", "🔥", "💪", "❤️", "👏"];

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messageId, emoji } = body;

  if (!messageId || typeof messageId !== "string") {
    return NextResponse.json({ error: "Invalid messageId" }, { status: 400 });
  }

  if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
    return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
  }

  const supabase = createServerClient();

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const ipHash = hashIp(ip);

  // 이미 리액션이 있으면 제거(토글 off), 없으면 추가(토글 on)
  const { data: existing } = await supabase
    .from("guestbook_reactions")
    .select("id")
    .eq("message_id", messageId)
    .eq("emoji", emoji)
    .eq("ip_hash", ipHash)
    .single();

  let active: boolean;

  if (existing) {
    await supabase.from("guestbook_reactions").delete().eq("id", existing.id);
    active = false;
  } else {
    const { error } = await supabase.from("guestbook_reactions").insert({
      message_id: messageId,
      emoji,
      ip_hash: ipHash,
    });
    if (error) {
      return NextResponse.json(
        { error: "Failed to save reaction" },
        { status: 500 }
      );
    }
    active = true;
  }

  // 업데이트된 카운트 반환
  const { count } = await supabase
    .from("guestbook_reactions")
    .select("*", { count: "exact", head: true })
    .eq("message_id", messageId)
    .eq("emoji", emoji);

  return NextResponse.json({ count: count || 0, active });
}
