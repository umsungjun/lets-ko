export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  /** 채널 표시명 (playlistItems 응답의 snippet.channelTitle) */
  channelTitle?: string;
  /** YOUTUBE_CHANNELS config의 slug — UI 그룹화 키 */
  channelSlug?: string;
}

export interface YouTubeChannelInfo {
  channelId: string;
  /** 채널 원본 표시명 (snippet.title) */
  title: string;
  /** 채널 아바타 URL (medium 우선, 88x88 권장) */
  thumbnailUrl?: string;
  /** API가 hiddenSubscriberCount=true인 채널은 0 반환 */
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
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

interface YouTubePlaylistItem {
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    channelTitle?: string;
    resourceId?: { videoId?: string };
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
}

interface YouTubePlaylistResponse {
  items?: YouTubePlaylistItem[];
}

interface YouTubeChannelItem {
  id: string;
  snippet?: {
    title?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
  statistics?: {
    subscriberCount?: string;
    viewCount?: string;
    videoCount?: string;
    hiddenSubscriberCount?: boolean;
  };
}

interface YouTubeChannelsResponse {
  items?: YouTubeChannelItem[];
}

export const SEARCH_QUERY = "고석현 Ko Seokhyeon UFC";
const MAX_RESULTS = 9;
// 채널 페이지 캐시: 30분. playlistItems/channels.list는 호출당 1 unit이라 quota는 여유로움
const CHANNEL_CACHE_SECONDS = 1800;

export async function searchYouTubeVideos(
  order: "date" | "viewCount" = "date"
): Promise<YouTubeVideo[]> {
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
      order,
      key: apiKey,
    });

    // search.list는 호출당 100 quota unit이라 비용이 큼.
    //  - date(최신순): 새 영상 노출과 quota 보호의 절충으로 30분 갱신 (일 ~4.8k unit)
    //  - viewCount(인기순): 거의 변화 없으므로 24시간 유지 (quota 절약)
    const revalidate = order === "date" ? 1800 : 86400;
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
      { next: { revalidate } }
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

/**
 * @description 채널의 uploads playlist에서 최신 영상을 가져옴.
 *  playlistItems.list는 호출당 1 quota unit이라 search.list (100 unit)보다 훨씬 경제적.
 *  비공개·삭제된 영상은 자동 필터링.
 * @param uploadsPlaylistId - 채널의 업로드 playlist ID (UU로 시작, 24자)
 * @param maxResults - 가져올 영상 개수 (기본 6, YouTube API 최대 50)
 * @param channelSlug - 결과에 부착할 config slug (선택, UI 그룹화용)
 * @returns 영상 배열 (실패 시 빈 배열 — 절대 throw 하지 않음)
 */
export async function fetchChannelUploads(
  uploadsPlaylistId: string,
  maxResults = 6,
  channelSlug?: string
): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      part: "snippet",
      playlistId: uploadsPlaylistId,
      maxResults: String(Math.min(Math.max(maxResults, 1), 50)),
      key: apiKey,
    });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?${params}`,
      { next: { revalidate: CHANNEL_CACHE_SECONDS } }
    );

    if (!res.ok) return [];

    const data: YouTubePlaylistResponse = await res.json();
    if (!data.items) return [];

    return data.items
      .map((item): YouTubeVideo | null => {
        const videoId = item.snippet.resourceId?.videoId;
        const thumbnail =
          item.snippet.thumbnails?.high?.url ??
          item.snippet.thumbnails?.medium?.url ??
          item.snippet.thumbnails?.default?.url;

        // 비공개/삭제 영상은 title이 "Private video"/"Deleted video"이거나
        // thumbnail 자체가 누락됨 → 노출 가치가 없으므로 필터링
        if (
          !videoId ||
          !thumbnail ||
          item.snippet.title === "Private video" ||
          item.snippet.title === "Deleted video"
        ) {
          return null;
        }

        return {
          id: videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail,
          publishedAt: item.snippet.publishedAt,
          channelTitle: item.snippet.channelTitle,
          channelSlug,
        };
      })
      .filter((v): v is YouTubeVideo => v !== null);
  } catch {
    return [];
  }
}

/**
 * @description 여러 채널의 메타 정보(표시명·아바타·구독자·조회수·영상 수)를 단일 호출로 가져옴.
 *  channels.list는 id 콤마 결합으로 한 번에 최대 50개 채널 조회 가능 (호출당 1 quota — part 종류와 무관).
 *  snippet+statistics를 한번에 요청해 표시명, 아바타까지 함께 확보.
 * @param channelIds - 채널 ID 배열 (UC...)
 * @returns channelId → info 매핑 (실패 시 빈 Map)
 */
export async function fetchChannelInfos(
  channelIds: string[]
): Promise<Map<string, YouTubeChannelInfo>> {
  const result = new Map<string, YouTubeChannelInfo>();
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || channelIds.length === 0) return result;

  try {
    const params = new URLSearchParams({
      part: "snippet,statistics",
      id: channelIds.slice(0, 50).join(","),
      key: apiKey,
    });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?${params}`,
      { next: { revalidate: CHANNEL_CACHE_SECONDS } }
    );

    if (!res.ok) return result;

    const data: YouTubeChannelsResponse = await res.json();
    if (!data.items) return result;

    for (const item of data.items) {
      const stats = item.statistics;
      const snippet = item.snippet;
      const thumbnailUrl =
        snippet?.thumbnails?.medium?.url ??
        snippet?.thumbnails?.high?.url ??
        snippet?.thumbnails?.default?.url;

      result.set(item.id, {
        channelId: item.id,
        title: snippet?.title ?? "",
        thumbnailUrl,
        subscriberCount: Number(stats?.subscriberCount ?? 0),
        viewCount: Number(stats?.viewCount ?? 0),
        videoCount: Number(stats?.videoCount ?? 0),
      });
    }
  } catch {
    return result;
  }

  return result;
}
