import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { formatCents } from "../../shared/lib/format";
import { useStore } from "../../shared/lib/store";
import { lastOrderStore } from "./last-order";

/**
 * O pedido JÁ está salvo no painel do restaurante (ADR-0003).
 * Aqui o cliente envia a mensagem pronta pelo WhatsApp — abrimos automaticamente e deixamos o botão de reserva.
 */
export function OrderSentPage() {
  const { slug = "", number } = useParams();
  const last = useStore(lastOrderStore);
  const matches = last && last.slug === slug && String(last.order.number) === number;

  useEffect(() => {
    if (!matches) return;
    const key = `comandai:wa-opened:${slug}:${number}`;
    if (sessionStorage.getItem(key)) return; // não reabre ao voltar para a página
    sessionStorage.setItem(key, "1");
    window.location.href = last.whatsappUrl;
  }, [matches, last, slug, number]);

  if (!matches) return <Navigate to={`/r/${slug}`} replace />;
  const { order, whatsappUrl } = last;

  return (
    <div className="sent">
      <div className="sent__icon" aria-hidden>
        ✓
      </div>
      <h1>Pedido #{order.number} recebido!</h1>
      <p className="muted">
        O restaurante já está vendo seu pedido. Envie a mensagem no WhatsApp para confirmar e acompanhar por lá.
      </p>

      <a className="btn btn--whatsapp btn--block" href={whatsappUrl}>
        Enviar pedido no WhatsApp
      </a>

      <section className="card summary">
        {order.items.map((item, i) => (
          <p key={i} className="summary__row">
            <span>
              {item.quantity}x {item.name}
            </span>
            <span>{formatCents(item.totalCents)}</span>
          </p>
        ))}
        <p className="summary__row summary__total">
          <span>Total</span>
          <span>{formatCents(order.totalCents)}</span>
        </p>
      </section>

      <Link to={`/r/${slug}`} className="btn-link">
        Voltar ao cardápio
      </Link>
    </div>
  );
}
