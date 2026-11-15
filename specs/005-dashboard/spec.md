# 005 — Dashboard · Spec

**Status:** Implementada · **Depende de:** 003, 004

## User stories
- **US-005.1** Como dono, quero ver faturamento, nº de pedidos e ticket médio do período.
- **US-005.2** Como dono, quero ver os produtos mais vendidos.
- **US-005.3** Como dono, quero ver o faturamento por dia.

## Regras de negócio
- **BR-005.1** Faturamento considera pedidos **não cancelados**.
- **BR-005.2** Ticket médio = faturamento ÷ nº de pedidos não cancelados (arredondado para centavos; 0 se não houver pedidos).
- **BR-005.3** Período: `today`, `7d` ou `30d`, no fuso do restaurante (padrão `America/Sao_Paulo`).
- **BR-005.4** Série diária sempre com todos os dias do período, zerando dias sem venda.
- **BR-005.5** Top 5 produtos por quantidade, desempate por receita.
- **BR-005.6** Agregação feita em SQL (sem carregar pedidos em memória).

## Critérios de aceite
- **AC-005.1** *Given* pedidos de R$ 50 e R$ 30 e um cancelado de R$ 100, *then* faturamento R$ 80, 2 pedidos, ticket R$ 40.
- **AC-005.2** *Given* período `7d`, *then* a série tem 7 dias consecutivos terminando hoje.
- **AC-005.3** *Given* nenhum pedido, *then* tudo zerado e ticket 0.
