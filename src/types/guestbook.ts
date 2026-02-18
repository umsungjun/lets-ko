export interface GuestbookMessage {
  id: string;
  nickname: string;
  message: string;
  created_at: string;
  reactions?: Record<string, number>;
}

export interface GuestbookResponse {
  messages: GuestbookMessage[];
  hasMore: boolean;
  total: number;
}
