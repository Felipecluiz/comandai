import { z } from "zod";
import { centsSchema } from "./common";

export const registerInputSchema = z.object({
  restaurantName: z.string().trim().min(2).max(60),
  slug: z.string().trim().toLowerCase().min(3).max(40),
  whatsapp: z.string().trim().min(10).max(20),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres").max(128),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const updateRestaurantInputSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    whatsapp: z.string().trim().min(10).max(20),
    deliveryFeeCents: centsSchema.max(100_000),
    minOrderCents: centsSchema.max(1_000_000),
    acceptsDelivery: z.boolean(),
    acceptsPickup: z.boolean(),
    isOpen: z.boolean(),
  })
  .partial();
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantInputSchema>;

export interface RestaurantDto {
  id: string;
  slug: string;
  name: string;
  whatsapp: string;
  deliveryFeeCents: number;
  minOrderCents: number;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  isOpen: boolean;
}

export interface SessionDto {
  token: string;
  restaurant: RestaurantDto;
}
