export interface GuestbookMessage {
  id: string;
  nickname: string;
  message: string;
  created_at: string;
}

export interface GuestbookResponse {
  messages: GuestbookMessage[];
  hasMore: boolean;
  total: number;
}
