import type { OrderSnapshot, PaymentMethod } from "../entities/order";
import { formatBRL } from "../value-objects/money";
import { Phone } from "../value-objects/phone";

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix",
  card: "Cartão (na entrega/retirada)",
  cash: "Dinheiro",
};

/**
 * BR-003.8 — mensagem enviada ao WhatsApp do restaurante.
 * Função pura: mesma entrada, mesma saída. Reutilizável se um dia migrarmos para a Cloud API (ADR-0003).
 */
export function formatOrderMessage(order: OrderSnapshot, restaurantName: string): string {
  const lines: string[] = [
    `*Novo pedido #${order.number}* — ${restaurantName}`,
    "",
    ...order.items.flatMap((item) => [
      `${item.quantity}x ${item.name} — ${formatBRL(item.totalCents)}`,
      ...(item.notes ? [`   _Obs: ${item.notes}_`] : []),
    ]),
    "",
    `Subtotal: ${formatBRL(order.subtotalCents)}`,
  ];

  if (order.fulfillment.type === "delivery") {
    const a = order.fulfillment.address;
    lines.push(`Entrega: ${formatBRL(order.deliveryFeeCents)}`);
    lines.push(`*Total: ${formatBRL(order.totalCents)}*`, "");
    lines.push("📍 *Entrega*");
    lines.push(`${a.street}, ${a.number}${a.complement ? ` — ${a.complement}` : ""}`);
    lines.push(a.district);
    if (a.reference) lines.push(`Ref.: ${a.reference}`);
  } else {
    lines.push(`*Total: ${formatBRL(order.totalCents)}*`, "");
    lines.push("🏃 *Retirada no local*");
  }

  lines.push("", `💳 ${PAYMENT_LABEL[order.payment.method]}`);
  if (order.payment.changeForCents) lines.push(`Troco para ${formatBRL(order.payment.changeForCents)}`);

  lines.push("", `👤 ${order.customer.name} · ${Phone.restore(order.customer.phone).formatted()}`);
  return lines.join("\n");
}

export function buildWhatsAppUrl(phone: Phone, text: string): string {
  return `https://wa.me/${phone.digits}?text=${encodeURIComponent(text)}`;
}
