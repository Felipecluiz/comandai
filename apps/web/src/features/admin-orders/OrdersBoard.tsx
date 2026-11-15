import type { OrderDto } from "@comandai/contracts";
import { useCallback, useEffect, useState } from "react";
import { ErrorMessage, Loading } from "../../shared/ui/feedback";
import { useOrders } from "./api";
import { OrderCard } from "./OrderCard";
import { BOARD_COLUMNS } from "./status";
import { useOrdersStream, type StreamStatus } from "./use-orders-stream";

const STREAM_LABEL: Record<StreamStatus, string> = {
  live: "Ao vivo",
  connecting: "Conectando…",
  offline: "Reconectando…",
};

/** Som curto gerado na hora (sem arquivo de áudio). */
function playChime(): void {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.3);
    });
  } catch {
    // navegador bloqueou áudio antes de interação — ok
  }
}

export function OrdersBoard() {
  const { data: orders = [], isLoading, error } = useOrders();
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [, tick] = useState(0);

  const onNewOrder = useCallback(({ order }: { order: OrderDto }) => {
    playChime();
    setHighlighted((prev) => new Set(prev).add(order.id));
    document.title = `(${order.number}) Novo pedido · Comandaí`;
  }, []);
  const stream = useOrdersStream(onNewOrder);

  // atualiza os "há X min" a cada 30s
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const acknowledge = (id: string) => {
    setHighlighted((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    document.title = "Comandaí";
  };

  return (
    <section className="board-page">
      <header className="page-header">
        <h1>Pedidos</h1>
        <span className={`live-pill live-pill--${stream}`}>
          <span className="live-pill__dot" /> {STREAM_LABEL[stream]}
        </span>
      </header>

      {isLoading && <Loading />}
      {error && <ErrorMessage error={error} />}

      <div className="board">
        {BOARD_COLUMNS.map((column) => {
          const items = orders.filter((o) => column.statuses.includes(o.status));
          return (
            <div key={column.id} className={`board__column board__column--${column.id}`}>
              <h2>
                {column.title} <span className="count">{items.length}</span>
              </h2>
              {items.length === 0 && <p className="board__empty">Nada por aqui</p>}
              {items.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  highlighted={highlighted.has(order.id)}
                  onInteract={() => acknowledge(order.id)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
