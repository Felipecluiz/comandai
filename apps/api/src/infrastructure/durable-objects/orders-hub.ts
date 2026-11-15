import { DurableObject } from "cloudflare:workers";
import type { OrderEvent, OrderNotifier } from "../../application";

/**
 * Um OrdersHub por restaurante (ADR-0004). Mantém os WebSockets dos painéis abertos
 * usando a Hibernation API: o objeto dorme entre mensagens e não cobra duração ociosa.
 */
export class OrdersHub extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  /** Chamado via RPC pelo DurableObjectOrderNotifier. */
  async broadcast(message: string): Promise<number> {
    const sockets = this.ctx.getWebSockets();
    for (const socket of sockets) {
      try {
        socket.send(message);
      } catch {
        // socket já fechado — o runtime remove na próxima rodada
      }
    }
    return sockets.length;
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (message === "ping") socket.send("pong"); // heartbeat do painel
  }

  async webSocketClose(socket: WebSocket, code: number, reason: string): Promise<void> {
    socket.close(code, reason);
  }
}

export class DurableObjectOrderNotifier implements OrderNotifier {
  /** `serialize` vem do composition root: o formato público do evento é decisão da borda HTTP. */
  constructor(
    private readonly namespace: DurableObjectNamespace<OrdersHub>,
    private readonly serialize: (event: OrderEvent) => string = JSON.stringify,
  ) {}

  async publish(restaurantId: string, event: OrderEvent): Promise<void> {
    try {
      const hub = this.namespace.get(this.namespace.idFromName(restaurantId));
      await hub.broadcast(this.serialize(event));
    } catch (error) {
      // Contrato do port: nunca propagar. O pedido já está salvo; o painel ressincroniza ao reconectar.
      console.error("Falha ao notificar painel", { restaurantId, error });
    }
  }
}
