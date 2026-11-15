import { describe, expect, it } from "vitest";
import { openReconnectingSocket, type SocketStatus } from "./reconnecting-socket";

/** WebSocket falso: permite simular abertura, mensagens e quedas. */
class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.onclose?.();
  }
}

function setup() {
  FakeSocket.instances = [];
  (globalThis as { WebSocket?: unknown }).WebSocket = FakeSocket;
  const statuses: SocketStatus[] = [];
  const messages: string[] = [];
  let reconnects = 0;
  const dispose = openReconnectingSocket({
    url: () => "ws://test",
    onStatus: (s) => statuses.push(s),
    onMessage: (m) => messages.push(m),
    onReconnect: () => reconnects++,
    maxBackoffMs: 0,
    heartbeatMs: 60_000,
  });
  return { statuses, messages, dispose, reconnects: () => reconnects };
}

describe("openReconnectingSocket", () => {
  it("repassa mensagens e ignora o pong do heartbeat", () => {
    const { messages, statuses, dispose } = setup();
    const socket = FakeSocket.instances[0];
    socket?.onopen?.();
    socket?.onmessage?.({ data: "pong" });
    socket?.onmessage?.({ data: '{"type":"order.created"}' });
    expect(messages).toEqual(['{"type":"order.created"}']);
    expect(statuses).toEqual(["connecting", "live"]);
    dispose();
  });

  it("reconecta após queda e avisa para ressincronizar", async () => {
    const { statuses, reconnects, dispose } = setup();
    FakeSocket.instances[0]?.onopen?.();
    FakeSocket.instances[0]?.onclose?.(); // queda
    await new Promise((r) => setTimeout(r, 5));
    FakeSocket.instances[1]?.onopen?.();
    expect(FakeSocket.instances).toHaveLength(2);
    expect(reconnects()).toBe(1);
    expect(statuses).toEqual(["connecting", "live", "offline", "connecting", "live"]);
    dispose();
  });

  it("dispose encerra sem tentar reconectar", async () => {
    const { dispose } = setup();
    FakeSocket.instances[0]?.onopen?.();
    dispose();
    await new Promise((r) => setTimeout(r, 5));
    expect(FakeSocket.instances).toHaveLength(1);
  });
});
