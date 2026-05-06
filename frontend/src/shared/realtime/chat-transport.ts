import { useAuthStore } from '@features/auth/store/auth-store';
import type { ChatMessage, ChatRoundSummary, FeedbackSummary } from '@features/performance/api/performance-api';

export type ChatTypingEvent = {
  userId: number;
  senderName: string;
  senderNickname: string;
  typing: boolean;
};

type ChatTransportOptions = {
  chatRoomId: number;
  onConnected?: () => void;
  onMessage?: (message: ChatMessage) => void;
  onRound?: (round: ChatRoundSummary) => void;
  onFeedbackSummary?: (summaries: FeedbackSummary[]) => void;
  onTyping?: (event: ChatTypingEvent) => void;
  onError?: (error: Error) => void;
};

type SendMessagePayload = {
  targetPerformanceSongSessionId: number;
  content: string;
};

type StompFrame = {
  command: string;
  headers: Record<string, string>;
  body: string;
};

export class ChatTransport {
  private socket: WebSocket | null = null;
  private connected = false;
  private options: ChatTransportOptions | null = null;
  private subscriptionSeq = 0;
  private latestTypingState = false;

  connect(options: ChatTransportOptions) {
    this.disconnect();
    this.options = options;

    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      options.onError?.(new Error('Access Token이 없어 채팅 서버에 연결할 수 없습니다.'));
      return;
    }

    const socket = new WebSocket(`${resolveWebSocketBaseUrl()}/ws/`);
    this.socket = socket;

    socket.onopen = () => {
      this.sendFrame('CONNECT', {
        Authorization: `Bearer ${accessToken}`,
        'accept-version': '1.2',
        'heart-beat': '10000,10000',
      });
    };

    socket.onmessage = (event) => {
      String(event.data)
        .split('\0')
        .filter((rawFrame) => rawFrame.trim())
        .forEach((rawFrame) => this.handleFrame(parseFrame(rawFrame)));
    };

    socket.onerror = () => {
      options.onError?.(new Error('채팅 서버 연결 중 오류가 발생했습니다.'));
    };

    socket.onclose = () => {
      this.connected = false;
    };
  }

  disconnect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendFrame('DISCONNECT', {});
    }
    this.socket?.close();
    this.socket = null;
    this.connected = false;
    this.options = null;
    this.latestTypingState = false;
  }

  sendMessage(payload: SendMessagePayload) {
    const chatRoomId = this.options?.chatRoomId;
    if (!this.connected || !chatRoomId) {
      this.options?.onError?.(new Error('채팅 서버에 연결된 뒤 메시지를 보낼 수 있습니다.'));
      return;
    }

    this.sendFrame(
      'SEND',
      {
        destination: `/app/chat-rooms/${chatRoomId}/messages`,
        'content-type': 'application/json',
      },
      JSON.stringify(payload),
    );
  }

  sendTyping(typing: boolean) {
    this.latestTypingState = typing;
    const chatRoomId = this.options?.chatRoomId;
    if (!this.connected || !chatRoomId) {
      return;
    }

    this.sendFrame(
      'SEND',
      {
        destination: `/app/chat-rooms/${chatRoomId}/typing`,
        'content-type': 'application/json',
      },
      JSON.stringify({ typing }),
    );
  }

  private handleFrame(frame: StompFrame) {
    if (frame.command === 'CONNECTED') {
      this.connected = true;
      this.subscribe(`/topic/chat-rooms/${this.options?.chatRoomId}/messages`);
      this.subscribe(`/topic/chat-rooms/${this.options?.chatRoomId}/rounds`);
      this.subscribe(`/topic/chat-rooms/${this.options?.chatRoomId}/feedback-summaries`);
      this.subscribe(`/topic/chat-rooms/${this.options?.chatRoomId}/typing`);
      if (this.latestTypingState) {
        this.sendTyping(true);
      }
      this.options?.onConnected?.();
      return;
    }

    if (frame.command === 'ERROR') {
      this.options?.onError?.(new Error(frame.body || frame.headers.message || '채팅 서버 오류가 발생했습니다.'));
      return;
    }

    if (frame.command !== 'MESSAGE') {
      return;
    }

    const destination = frame.headers.destination ?? '';
    if (destination.endsWith('/messages')) {
      this.options?.onMessage?.(JSON.parse(frame.body) as ChatMessage);
    } else if (destination.endsWith('/rounds')) {
      this.options?.onRound?.(JSON.parse(frame.body) as ChatRoundSummary);
    } else if (destination.endsWith('/feedback-summaries')) {
      this.options?.onFeedbackSummary?.(JSON.parse(frame.body) as FeedbackSummary[]);
    } else if (destination.endsWith('/typing')) {
      this.options?.onTyping?.(JSON.parse(frame.body) as ChatTypingEvent);
    }
  }

  private subscribe(destination: string) {
    this.sendFrame('SUBSCRIBE', {
      id: `sub-${++this.subscriptionSeq}`,
      destination,
    });
  }

  private sendFrame(command: string, headers: Record<string, string>, body = '') {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const headerLines = Object.entries(headers).map(([key, value]) => `${key}:${value}`);
    this.socket.send([command, ...headerLines, '', body].join('\n') + '\0');
  }
}

function parseFrame(rawFrame: string): StompFrame {
  const [head, ...bodyParts] = rawFrame.split('\n\n');
  const [command, ...headerLines] = head.split('\n');
  const headers = Object.fromEntries(
    headerLines
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf(':');
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      }),
  );

  return {
    command,
    headers,
    body: bodyParts.join('\n\n'),
  };
}

function resolveWebSocketBaseUrl() {
  const explicitBaseUrl = import.meta.env.VITE_WS_BASE_URL as string | undefined;
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, '');
  }

  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || window.location.origin;
  const url = new URL(apiBaseUrl, window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.origin;
}
