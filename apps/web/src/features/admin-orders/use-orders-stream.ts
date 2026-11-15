import type { OrderEventDto } from "@comandai/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ordersStreamUrl } from "../../shared/api/http";
import { useSession } from "../auth/session";
import { ordersKey, upsertOrderInCache } from "./api";

export type StreamStatus = "connecting" | "live" | "offline";

const MAX_BACKOFF_MS = 30_000;
const HEARTBEAT_MS = 25_000;

/**
 * Conecta ao Durable Object do restaurante (ADR-0004) e aplica os eventos no cache do TanStack Query.
 * Reconecta com backoff exponencial e ressincroniza a lista ao voltar (pode ter perdido eventos).
 */
export function useOrdersStream(onNewOrder: (event: OrderEventDto) => void): StreamStatus {
  const session = useSession();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const onNewOrderRef = useRef(onNewOrder);
  onNewOrderRef.current = onNewOrder;

  useEffect(() => {
    if (!session) return;
    let socket: WebSocket | null = null;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let disposed = false;

    const connect = () => {
      setStatus("connecting");
      socket = new WebSocket(ordersStreamUrl(session.token));

      socket.onopen = () => {
        if (attempts > 0) void queryClient.invalidateQueries({ queryKey: ordersKey });
        attempts = 0;
        setStatus("live");
        heartbeat = setInterval(() => socket?.readyState === WebSocket.OPEN && socket.send("ping"), HEARTBEAT_MS);
      };

      socket.onmessage = ({ data }) => {
        if (data === "pong") return;
        const event = JSON.parse(String(data)) as OrderEventDto;
        upsertOrderInCache(queryClient, event.order);
        if (event.type === "order.created") onNewOrderRef.current(event);
      };

      socket.onclose = () => {
        clearInterval(heartbeat);
        if (disposed) return;
        setStatus("offline");
        const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempts++);
        retry = setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(retry);
      clearInterval(heartbeat);
      socket?.close();
    };
  }, [session?.token, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  return status;
}
