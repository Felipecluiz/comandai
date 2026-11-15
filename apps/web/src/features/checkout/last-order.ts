import type { PlaceOrderResultDto } from "@comandai/contracts";
import { createPersistentStore } from "../../shared/lib/store";

/** Último pedido feito neste navegador — permite reabrir a tela de sucesso e reenviar no WhatsApp. */
export const lastOrderStore = createPersistentStore<(PlaceOrderResultDto & { slug: string }) | null>(
  "comandai:last-order",
  null,
);
