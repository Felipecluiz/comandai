# 005 — Plan

- Port de leitura `DashboardQueries` (CQRS leve, como no FinTrack): `totals`, `topProducts`, `revenueByDay`.
- Itens de pedido em tabela própria (`order_items`) para permitir `GROUP BY product_id`.
- Datas: pedidos guardam `created_at` UTC e `local_date` (data no fuso do restaurante) calculada no domínio → agregação por dia é um `GROUP BY local_date` simples.
- Caso de uso `GetDashboard(period)` calcula o range de datas com o `Clock` e preenche os dias vazios.
