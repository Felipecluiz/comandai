import type { OrderDto } from "@comandai/contracts";
import { useState } from "react";
import { formatCents, formatPhoneDigits, formatTime, minutesSince } from "../../shared/lib/format";
import { ErrorMessage } from "../../shared/ui/feedback";
import { useChangeOrderStatus } from "./api";
import { ACTION_LABEL, STATUS_LABEL, primaryAction } from "./status";

const PAYMENT_LABEL = { pix: "Pix", card: "Cartão", cash: "Dinheiro" } as const;

interface Props {
  order: OrderDto;
  highlighted: boolean;
  onInteract: () => void;
}

export function OrderCard({ order, highlighted, onInteract }: Props) {
  const [expanded, setExpanded] = useState(order.status === "pending");
  const change = useChangeOrderStatus();
  const next = primaryAction(order);
  const canCancel = order.allowedTransitions.includes("cancelled");
  const minutes = minutesSince(order.createdAt);
  const late = minutes >= 40 && !["completed", "cancelled"].includes(order.status);

  const move = (status: OrderDto["status"], reason?: string) => {
    onInteract();
    change.mutate({ id: order.id, status, reason });
  };

  const cancel = () => {
    const reason = window.prompt(`Motivo do cancelamento do pedido #${order.number}:`);
    if (reason && reason.trim().length >= 3) move("cancelled", reason.trim());
  };

  return (
    <article
      className={`order-card ${highlighted ? "order-card--new" : ""} order-card--${order.status}`}
      onClick={onInteract}
    >
      <header className="order-card__head" onClick={() => setExpanded((e) => !e)}>
        <strong>#{order.number}</strong>
        <span className="grow">{order.customer.name}</span>
        <span className={`tag ${late ? "tag--late" : ""}`} title={formatTime(order.createdAt)}>
          {minutes < 1 ? "agora" : `${minutes} min`}
        </span>
      </header>

      <p className="order-card__meta">
        <span>{order.fulfillment.type === "delivery" ? "🛵 Entrega" : "🏃 Retirada"}</span>
        <span>{PAYMENT_LABEL[order.payment.method]}</span>
        <strong>{formatCents(order.totalCents)}</strong>
      </p>

      {expanded && (
        <div className="order-card__body">
          <ul>
            {order.items.map((item, i) => (
              <li key={i}>
                <b>{item.quantity}x</b> {item.name}
                {item.notes && <em> — {item.notes}</em>}
              </li>
            ))}
          </ul>
          {order.fulfillment.type === "delivery" && (
            <p className="muted small">
              📍 {order.fulfillment.address.street}, {order.fulfillment.address.number}
              {order.fulfillment.address.complement && ` (${order.fulfillment.address.complement})`} —{" "}
              {order.fulfillment.address.district}
            </p>
          )}
          {order.payment.changeForCents && (
            <p className="muted small">💵 Troco para {formatCents(order.payment.changeForCents)}</p>
          )}
          {order.cancelReason && <p className="muted small">Motivo: {order.cancelReason}</p>}
          <a
            className="btn-link small"
            href={`https://wa.me/${order.customer.phone}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            💬 {formatPhoneDigits(order.customer.phone)}
          </a>
        </div>
      )}

      {change.error && <ErrorMessage error={change.error} />}

      <footer className="order-card__actions">
        {!next && <span className="muted small">{STATUS_LABEL[order.status]}</span>}
        {next && (
          <button
            className="btn btn--primary btn--sm"
            disabled={change.isPending}
            onClick={(e) => {
              e.stopPropagation();
              move(next);
            }}
          >
            {ACTION_LABEL[next] ?? STATUS_LABEL[next]}
          </button>
        )}
        {canCancel && (
          <button
            className="btn-link danger small"
            disabled={change.isPending}
            onClick={(e) => {
              e.stopPropagation();
              cancel();
            }}
          >
            Cancelar
          </button>
        )}
      </footer>
    </article>
  );
}
