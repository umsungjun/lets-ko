export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
}

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      high: { url: string };
    };
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

const SEARCH_QUERY = "고석현 UFC";
const MAX_RESULTS = 6;

export async function searchYouTubeVideos(): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      part: "snippet",
      q: SEARCH_QUERY,
      type: "video",
      maxResults: String(MAX_RESULTS),
      order: "date",
      key: apiKey,
    });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
      { next: { revalidate: 86400 } }
    );

    if (!res.ok) {
      return [];
    }

    const data: YouTubeSearchResponse = await res.json();

    if (!data.items) {
      return [];
    }

    return data.items.map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high.url,
      publishedAt: item.snippet.publishedAt,
    }));
  } catch {
    return [];
  }
}
