import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatCents } from "../../shared/lib/format";
import { Modal } from "../../shared/ui/Modal";
import { useCart } from "./cart";
import { QuantityStepper } from "./QuantityStepper";

/** Barra fixa no rodapé (estilo app de delivery) + gaveta com os itens. */
export function CartBar({ slug }: { slug: string }) {
  const cart = useCart(slug);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (cart.count === 0) return null;

  return (
    <>
      <button className="cart-bar" onClick={() => setOpen(true)}>
        <span className="cart-bar__count">{cart.count}</span>
        <span>Ver sacola</span>
        <strong>{formatCents(cart.subtotalCents)}</strong>
      </button>

      <Modal title="Sua sacola" open={open} onClose={() => setOpen(false)}>
        <ul className="cart-lines">
          {cart.lines.map((line) => (
            <li key={line.key}>
              <div className="grow">
                <strong>{line.name}</strong>
                {line.notes && <small className="muted">Obs: {line.notes}</small>}
                <span className="price">{formatCents(line.unitPriceCents * line.quantity)}</span>
              </div>
              <QuantityStepper value={line.quantity} onChange={(q) => cart.setQuantity(line.key, q)} />
            </li>
          ))}
        </ul>
        <footer className="sheet__footer">
          <div className="grow">
            <small className="muted">Subtotal</small>
            <strong className="price">{formatCents(cart.subtotalCents)}</strong>
          </div>
          <button className="btn btn--primary" onClick={() => navigate(`/r/${slug}/checkout`)}>
            Continuar
          </button>
        </footer>
      </Modal>
    </>
  );
}
