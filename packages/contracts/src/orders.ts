import { z } from "zod";
import { idSchema } from "./common";

export const MAX_ORDER_LINES = 30;
export const MAX_LINE_QUANTITY = 50;

export const orderStatusSchema = z.enum([
  "pending",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
]);
export type OrderStatusDto = z.infer<typeof orderStatusSchema>;

export const paymentMethodSchema = z.enum(["pix", "card", "cash"]);
export type PaymentMethodDto = z.infer<typeof paymentMethodSchema>;

const addressSchema = z.object({
  street: z.string().trim().min(3).max(120),
  number: z.string().trim().min(1).max(10),
  district: z.string().trim().min(2).max(60),
  complement: z.string().trim().max(60).default(""),
  reference: z.string().trim().max(100).default(""),
});
export type AddressDto = z.infer<typeof addressSchema>;

/** ADR-0005: só id, quantidade e observação. Campos extras (ex.: preço) são descartados. */
const orderLineSchema = z.object({
  productId: idSchema,
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
  notes: z.string().trim().max(140).default(""),
});

export const placeOrderInputSchema = z
  .object({
    customer: z.object({
      name: z.string().trim().min(2).max(60),
      phone: z.string().trim().min(10).max(20),
    }),
    fulfillment: z.discriminatedUnion("type", [
      z.object({ type: z.literal("delivery"), address: addressSchema }),
      z.object({ type: z.literal("pickup") }),
    ]),
    payment: z.object({
      method: paymentMethodSchema,
      changeForCents: z.number().int().positive().optional(),
    }),
    items: z.array(orderLineSchema).min(1, "Carrinho vazio").max(MAX_ORDER_LINES),
  })
  .strip();
export type PlaceOrderInput = z.infer<typeof placeOrderInputSchema>;

export const changeOrderStatusInputSchema = z.object({
  status: orderStatusSchema,
  reason: z.string().trim().max(140).optional(),
});
export type ChangeOrderStatusInput = z.infer<typeof changeOrderStatusInputSchema>;

export const listOrdersQuerySchema = z.object({
  scope: z.enum(["active", "recent"]).default("recent"),
});

export interface OrderItemDto {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  notes: string;
  totalCents: number;
}

export interface OrderDto {
  id: string;
  number: number;
  status: OrderStatusDto;
  customer: { name: string; phone: string };
  fulfillment: { type: "delivery"; address: AddressDto } | { type: "pickup" };
  payment: { method: PaymentMethodDto; changeForCents?: number };
  items: OrderItemDto[];
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  cancelReason?: string;
  statusHistory: Array<{ status: OrderStatusDto; at: string }>;
  createdAt: string;
  /** Calculado pela máquina de estados do domínio — o front não duplica a regra. */
  allowedTransitions: OrderStatusDto[];
}

export interface PlaceOrderResultDto {
  order: OrderDto;
  whatsappUrl: string;
}

export type OrderEventDto =
  | { type: "order.created"; order: OrderDto }
  | { type: "order.updated"; order: OrderDto };
