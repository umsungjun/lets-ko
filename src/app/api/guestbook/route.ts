import { NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

import { createHash } from "crypto";

const PAGE_SIZE_DEFAULT = 20;
const RATE_LIMIT_SECONDS = 30;

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit") || PAGE_SIZE_DEFAULT))
  );
  const offset = (page - 1) * limit;

  const supabase = createServerClient();

  const [{ data: messages, error }, { count }] = await Promise.all([
    supabase
      .from("guestbook_messages")
      .select("id, nickname, message, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1),
    supabase
      .from("guestbook_messages")
      .select("*", { count: "exact", head: true }),
  ]);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }

  // 리액션 집계
  const messageIds = (messages || []).map((m) => m.id);
  const reactionsMap: Record<string, Record<string, number>> = {};

  if (messageIds.length > 0) {
    const { data: reactionRows } = await supabase
      .from("guestbook_reactions")
      .select("message_id, emoji")
      .in("message_id", messageIds);

    for (const row of reactionRows || []) {
      if (!reactionsMap[row.message_id]) reactionsMap[row.message_id] = {};
      reactionsMap[row.message_id][row.emoji] =
        (reactionsMap[row.message_id][row.emoji] || 0) + 1;
    }
  }

  const messagesWithReactions = (messages || []).map((m) => ({
    ...m,
    reactions: reactionsMap[m.id] || {},
  }));

  return NextResponse.json({
    messages: messagesWithReactions,
    hasMore: (count || 0) > offset + limit,
    total: count || 0,
  });
}

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { nickname, message } = body;

  if (
    !nickname ||
    typeof nickname !== "string" ||
    nickname.trim().length === 0 ||
    nickname.trim().length > 50
  ) {
    return NextResponse.json(
      { error: "Invalid nickname (1-50 chars)" },
      { status: 400 }
    );
  }

  if (
    !message ||
    typeof message !== "string" ||
    message.trim().length === 0 ||
    message.trim().length > 500
  ) {
    return NextResponse.json(
      { error: "Invalid message (1-500 chars)" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Rate limiting by IP hash
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const ipHash = hashIp(ip);

  const { data: recent } = await supabase
    .from("guestbook_messages")
    .select("created_at")
    .eq("ip_hash", ipHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (recent) {
    const lastTime = new Date(recent.created_at).getTime();
    const now = Date.now();
    if (now - lastTime < RATE_LIMIT_SECONDS * 1000) {
      return NextResponse.json(
        { error: "Please wait before posting again" },
        { status: 429 }
      );
    }
  }

  const { data, error } = await supabase
    .from("guestbook_messages")
    .insert({
      nickname: nickname.trim(),
      message: message.trim(),
      ip_hash: ipHash,
    })
    .select("id, nickname, message, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, message } = body;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  if (
    !message ||
    typeof message !== "string" ||
    message.trim().length === 0 ||
    message.trim().length > 500
  ) {
    return NextResponse.json(
      { error: "Invalid message (1-500 chars)" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // IP 검증: 작성자 본인만 수정 가능
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const ipHash = hashIp(ip);

  const { data: existing } = await supabase
    .from("guestbook_messages")
    .select("ip_hash")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (existing.ip_hash !== ipHash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("guestbook_messages")
    .update({ message: message.trim() })
    .eq("id", id)
    .select("id, nickname, message, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update message" },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: data });
}

export async function DELETE(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id } = body;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = createServerClient();

  // IP 검증: 작성자 본인만 삭제 가능
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const ipHash = hashIp(ip);

  const { data: existing } = await supabase
    .from("guestbook_messages")
    .select("ip_hash")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (existing.ip_hash !== ipHash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { error } = await supabase
    .from("guestbook_messages")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
