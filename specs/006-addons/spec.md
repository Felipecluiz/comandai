# 006 — Adicionais/complementos · Spec (Proposta)

**Status:** Proposta — próximo passo sugerido.

## Ideia
Produtos com grupos de opções (ex.: "Borda" — escolha 1; "Adicionais" — até 3), cada opção com preço extra.

## Regras propostas
- **BR-006.1** Grupo tem `min` e `max` de escolhas; obrigatório quando `min ≥ 1`.
- **BR-006.2** Preço do item = preço base + soma das opções (servidor recalcula, como na BR-003.1).
- **BR-006.3** Snapshot das opções escolhidas vai para o pedido e para a mensagem do WhatsApp.

> Escreva `plan.md` e `tasks.md` antes de implementar.
