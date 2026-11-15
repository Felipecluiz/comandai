# ADR-0004 — Tempo real com Durable Objects + WebSocket Hibernation

**Status:** Aceita

## Contexto
O painel precisa receber pedidos novos na hora. Polling a cada poucos segundos gera muitas leituras no D1 e atraso.

## Decisão
Um Durable Object `OrdersHub` por restaurante (`idFromName(restaurantId)`) mantém os WebSockets dos painéis abertos. O caso de uso publica eventos pelo port `OrderNotifier`; o adapter chama o DO, que faz broadcast.

Usamos a **Hibernation API** (`state.acceptWebSocket`): o DO dorme enquanto não há mensagens e não cobra duração ociosa.

## Consequências
- ✅ Latência baixa e isolamento natural por tenant (um DO por restaurante).
- ✅ Custo próximo de zero para restaurantes pequenos.
- ⚠️ Se a publicação falhar, o pedido continua salvo (falha é logada, não propagada). O painel também refaz a busca ao reconectar.
