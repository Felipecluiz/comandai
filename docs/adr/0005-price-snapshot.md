# ADR-0005 — Preço calculado no servidor e snapshot no pedido

**Status:** Aceita

## Decisão
1. O endpoint público recebe só `productId`, `quantity` e `notes`. Qualquer campo de preço enviado é descartado pelo schema Zod (`strip`).
2. O pedido copia `name` e `unitPriceCents` de cada produto para `order_items`.

## Consequências
- ✅ Impossível adulterar preço pelo DevTools.
- ✅ Relatórios e histórico refletem o preço cobrado na época, mesmo após reajustes.
- ⚠️ Dados duplicados (nome/preço) — intencional.
