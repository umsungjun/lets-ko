import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ videos: [] });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ videos: [] });
  }

  try {
    const params = new URLSearchParams({
      part: "snippet",
      q: `${name} UFC fight highlights full`,
      type: "video",
      maxResults: "3",
      order: "relevance",
      videoDuration: "medium", // 4~20분: 풀파이트·하이라이트 범위
      key: apiKey,
    });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
      { next: { revalidate: 86400 } }
    );

    if (!res.ok) {
      return NextResponse.json({ videos: [] });
    }

    const data = await res.json();

    const videos = (data.items ?? []).map(
      (item: {
        id: { videoId: string };
        snippet: {
          title: string;
          thumbnails: { high: { url: string } };
          publishedAt: string;
        };
      }) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        publishedAt: item.snippet.publishedAt,
      })
    );

    return NextResponse.json({ videos });
  } catch {
    return NextResponse.json({ videos: [] });
  }
}
