/**
 * @description /[locale]/youtube 페이지에서 영상을 가져올 YouTube 채널 목록.
 *  새 채널 추가: 객체 한 줄만 추가하면 됨.
 *  uploadsPlaylistId는 channelId의 두 번째 글자만 C → U로 바꾸면 됨 (UCxxx → UUxxx).
 *  채널 ID 확인: 채널 페이지 source에서 "browseId":"UC..." 검색 또는 og:url meta 태그 참고.
 */

export interface YouTubeChannelConfig {
  /** 고유 slug — React key, 정렬 안정성, 디버깅용 */
  slug: string;
  /** UC로 시작하는 24자 채널 ID */
  channelId: string;
  /** UU로 시작하는 업로드 playlist ID (channelId 두 번째 글자만 변경) */
  uploadsPlaylistId: string;
  /** 채널 @handle (외부 링크용, 선택) */
  handle?: string;
  /**
   * fallback 표시명.
   *  YouTube API에서 받아온 snippet.title을 우선 사용하고,
   *  API 실패/지연 시 이 값으로 폴백.
   */
  fallbackTitle: string;
  /** 가져올 최신 영상 개수 (기본 6) */
  maxResults?: number;
}

export const YOUTUBE_CHANNELS: YouTubeChannelConfig[] = [
  {
    slug: "stungun-tv",
    channelId: "UCXVhGNDrOfVUYEvuRdM0OXA",
    uploadsPlaylistId: "UUXVhGNDrOfVUYEvuRdM0OXA",
    handle: "@stungunTV",
    fallbackTitle: "StungunTV",
  },
  {
    slug: "korean-zombie",
    channelId: "UCc7o0OkR2BDFN4TCgPChjEw",
    uploadsPlaylistId: "UUc7o0OkR2BDFN4TCgPChjEw",
    handle: "@koreanzombie",
    fallbackTitle: "정찬성 Korean Zombie",
  },
  {
    slug: "ufc-official",
    channelId: "UCvgfXK4nTYKudb0rFR6noLA",
    uploadsPlaylistId: "UUvgfXK4nTYKudb0rFR6noLA",
    handle: "@ufc",
    fallbackTitle: "UFC",
  },
  {
    slug: "kim-daehwan-tv",
    channelId: "UCcl2AJmA36rLyhd9d7dxF9w",
    uploadsPlaylistId: "UUcl2AJmA36rLyhd9d7dxF9w",
    handle: "@kylerttt",
    fallbackTitle: "김대환TV",
  },
];
