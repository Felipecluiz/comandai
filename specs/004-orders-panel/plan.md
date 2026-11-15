# 004 — Plan

## Domínio
`Order.changeStatus(next, now, reason?)` com tabela de transições e histórico (`statusHistory`).

## Tempo real (ADR-0004)
- **Durable Object `OrdersHub`**, uma instância por restaurante (`idFromName(restaurantId)`).
- Painel abre `GET /api/admin/orders/stream?token=…` → Worker valida o token e repassa o upgrade para o DO.
- O DO usa a **WebSocket Hibernation API** (não paga duração enquanto ocioso).
- Port `OrderNotifier.publish(restaurantId, event)` → adapter faz `POST /broadcast` no DO.
- Web: hook `useOrdersStream` com reconexão exponencial; ao receber evento, atualiza o cache do TanStack Query.

## Casos de uso
`ListOrders`, `ChangeOrderStatus`.

## HTTP
| Método | Rota |
|---|---|
| GET | `/api/admin/orders?scope=active` |
| PATCH | `/api/admin/orders/:id/status` |
| GET (WS) | `/api/admin/orders/stream` |
