import type { OrderEventDto } from "@comandai/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ordersStreamUrl } from "../../shared/api/http";
import { openReconnectingSocket, type SocketStatus } from "../../shared/lib/reconnecting-socket";
import { useSession } from "../auth/session";
import { ordersKey, upsertOrderInCache } from "./api";

export type StreamStatus = SocketStatus;

/**
 * Conecta ao Durable Object do restaurante (ADR-0004) e aplica os eventos no cache do TanStack Query.
 * Ao reconectar, refaz a busca da lista: eventos podem ter sido perdidos durante a queda.
 */
export function useOrdersStream(onNewOrder: (event: OrderEventDto) => void): StreamStatus {
  const token = useSession()?.token;
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const onNewOrderRef = useRef(onNewOrder);
  onNewOrderRef.current = onNewOrder;

  useEffect(() => {
    if (!token) return;
    return openReconnectingSocket({
      url: () => ordersStreamUrl(token),
      onStatus: setStatus,
      onReconnect: () => void queryClient.invalidateQueries({ queryKey: ordersKey }),
      onMessage: (data) => {
        const event = JSON.parse(data) as OrderEventDto;
        upsertOrderInCache(queryClient, event.order);
        if (event.type === "order.created") onNewOrderRef.current(event);
      },
    });
  }, [token, queryClient]);

  return status;
}
