import type { PaymentMethodDto, PlaceOrderInput } from "@comandai/contracts";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { createPersistentStore, useStore } from "../../shared/lib/store";
import { formatCents, maskPhone, parseBRLToCents } from "../../shared/lib/format";
import { ErrorMessage, Field, Loading, fieldError, hasFieldErrors } from "../../shared/ui/feedback";
import { useCart } from "../cart/cart";
import { usePlaceOrder, usePublicMenu } from "../menu/api";
import { lastOrderStore } from "./last-order";

/** Lembra nome/telefone/endereço do cliente para o próximo pedido. */
const customerStore = createPersistentStore("comandai:customer", {
  name: "",
  phone: "",
  street: "",
  number: "",
  district: "",
  complement: "",
  reference: "",
});

const PAYMENT_OPTIONS: Array<{ value: PaymentMethodDto; label: string }> = [
  { value: "pix", label: "Pix" },
  { value: "card", label: "Cartão" },
  { value: "cash", label: "Dinheiro" },
];

export function CheckoutPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { data: menu, isLoading } = usePublicMenu(slug);
  const cart = useCart(slug);
  const placeOrder = usePlaceOrder(slug);

  const saved = useStore(customerStore);
  const [customer, setCustomer] = useState(saved);
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [payment, setPayment] = useState<PaymentMethodDto>("pix");
  const [changeFor, setChangeFor] = useState("");

  if (isLoading || !menu) return <Loading />;
  if (cart.count === 0) return <Navigate to={`/r/${slug}`} replace />;

  const { restaurant } = menu;
  const type = restaurant.acceptsDelivery ? fulfillment : "pickup";
  const deliveryFee = type === "delivery" ? restaurant.deliveryFeeCents : 0;
  const total = cart.subtotalCents + deliveryFee;
  const belowMinimum = cart.subtotalCents < restaurant.minOrderCents;
  const err = (field: string) => fieldError(placeOrder.error, field);
  const set = (key: keyof typeof customer) => (value: string) => setCustomer((c) => ({ ...c, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const changeForCents = payment === "cash" && changeFor ? (parseBRLToCents(changeFor) ?? undefined) : undefined;

    const input: PlaceOrderInput = {
      customer: { name: customer.name, phone: customer.phone },
      fulfillment:
        type === "delivery"
          ? {
              type,
              address: {
                street: customer.street,
                number: customer.number,
                district: customer.district,
                complement: customer.complement,
                reference: customer.reference,
              },
            }
          : { type },
      payment: { method: payment, changeForCents },
      items: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, notes: l.notes })),
    };

    placeOrder.mutate(input, {
      onSuccess: (result) => {
        customerStore.set(customer);
        lastOrderStore.set({ slug, ...result });
        cart.clear();
        navigate(`/r/${slug}/pedido/${result.order.number}`, { replace: true });
      },
    });
  };

  return (
    <form className="checkout" onSubmit={submit} noValidate>
      <header className="checkout__header">
        <Link to={`/r/${slug}`} className="btn-link">
          ← Voltar ao cardápio
        </Link>
        <h1>Finalizar pedido</h1>
      </header>

      <section className="card">
        <h2 className="card__title">Seus dados</h2>
        <Field label="Nome" error={err("customer.name")}>
          <input value={customer.name} onChange={(e) => set("name")(e.target.value)} autoComplete="name" required />
        </Field>
        <Field label="WhatsApp" error={err("customer.phone")}>
          <input
            value={customer.phone}
            onChange={(e) => set("phone")(maskPhone(e.target.value))}
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 98765-4321"
            required
          />
        </Field>
      </section>

      <section className="card">
        <h2 className="card__title">Como você quer receber?</h2>
        <div className="segmented">
          {restaurant.acceptsDelivery && (
            <button type="button" className={type === "delivery" ? "is-active" : ""} onClick={() => setFulfillment("delivery")}>
              🛵 Entrega · {formatCents(restaurant.deliveryFeeCents)}
            </button>
          )}
          {restaurant.acceptsPickup && (
            <button type="button" className={type === "pickup" ? "is-active" : ""} onClick={() => setFulfillment("pickup")}>
              🏃 Retirar no local
            </button>
          )}
        </div>

        {type === "delivery" && (
          <div className="grid-2">
            <Field label="Rua" error={err("fulfillment.address.street") ?? err("address.street")}>
              <input value={customer.street} onChange={(e) => set("street")(e.target.value)} autoComplete="address-line1" />
            </Field>
            <Field label="Número" error={err("fulfillment.address.number") ?? err("address.number")}>
              <input value={customer.number} onChange={(e) => set("number")(e.target.value)} />
            </Field>
            <Field label="Bairro" error={err("fulfillment.address.district") ?? err("address.district")}>
              <input value={customer.district} onChange={(e) => set("district")(e.target.value)} />
            </Field>
            <Field label="Complemento">
              <input value={customer.complement} onChange={(e) => set("complement")(e.target.value)} placeholder="Apto, bloco…" />
            </Field>
            <Field label="Ponto de referência">
              <input value={customer.reference} onChange={(e) => set("reference")(e.target.value)} />
            </Field>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">Pagamento (na entrega/retirada)</h2>
        <div className="segmented">
          {PAYMENT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={payment === option.value ? "is-active" : ""}
              onClick={() => setPayment(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {payment === "cash" && (
          <Field label="Troco para quanto?" hint="Deixe vazio se não precisar" error={err("payment.changeForCents")}>
            <input value={changeFor} onChange={(e) => setChangeFor(e.target.value)} inputMode="decimal" placeholder="100,00" />
          </Field>
        )}
      </section>

      <section className="card summary">
        <h2 className="card__title">Resumo</h2>
        {cart.lines.map((l) => (
          <p key={l.key} className="summary__row">
            <span>
              {l.quantity}x {l.name}
            </span>
            <span>{formatCents(l.unitPriceCents * l.quantity)}</span>
          </p>
        ))}
        <p className="summary__row muted">
          <span>Subtotal</span>
          <span>{formatCents(cart.subtotalCents)}</span>
        </p>
        {type === "delivery" && (
          <p className="summary__row muted">
            <span>Entrega</span>
            <span>{formatCents(deliveryFee)}</span>
          </p>
        )}
        <p className="summary__row summary__total">
          <span>Total</span>
          <span>{formatCents(total)}</span>
        </p>
      </section>

      {belowMinimum && <p className="notice">Pedido mínimo: {formatCents(restaurant.minOrderCents)}</p>}
      {placeOrder.error && !hasFieldErrors(placeOrder.error) && <ErrorMessage error={placeOrder.error} />}

      <button className="btn btn--whatsapp btn--block" disabled={placeOrder.isPending || belowMinimum}>
        {placeOrder.isPending ? "Enviando…" : `Fazer pedido · ${formatCents(total)}`}
      </button>
    </form>
  );
}
