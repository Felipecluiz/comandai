export type SocketStatus = "connecting" | "live" | "offline";

export interface ReconnectingSocketOptions {
  url: () => string;
  onMessage: (data: string) => void;
  onStatus: (status: SocketStatus) => void;
  /** Chamado ao reconectar após uma queda: hora de ressincronizar o que pode ter sido perdido. */
  onReconnect?: () => void;
  maxBackoffMs?: number;
  heartbeatMs?: number;
}

/**
 * WebSocket com reconexão (backoff exponencial) e heartbeat "ping"/"pong".
 * Retorna a função que encerra a conexão de vez.
 */
export function openReconnectingSocket(options: ReconnectingSocketOptions): () => void {
  const { maxBackoffMs = 30_000, heartbeatMs = 25_000 } = options;
  let socket: WebSocket | null = null;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0;
  let disposed = false;

  const connect = () => {
    options.onStatus("connecting");
    socket = new WebSocket(options.url());

    socket.onopen = () => {
      if (attempts > 0) options.onReconnect?.();
      attempts = 0;
      options.onStatus("live");
      heartbeat = setInterval(() => socket?.readyState === WebSocket.OPEN && socket.send("ping"), heartbeatMs);
    };

    socket.onmessage = ({ data }) => {
      if (data !== "pong") options.onMessage(String(data));
    };

    socket.onclose = () => {
      clearInterval(heartbeat);
      if (disposed) return;
      options.onStatus("offline");
      retry = setTimeout(connect, Math.min(maxBackoffMs, 1000 * 2 ** attempts++));
    };
  };

  connect();
  return () => {
    disposed = true;
    clearTimeout(retry);
    clearInterval(heartbeat);
    socket?.close();
  };
}
