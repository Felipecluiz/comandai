# 003 — Plan

## Domínio
- `Order` (aggregate root): `id`, `restaurantId`, `number`, `customer`, `fulfillment` (`delivery` + endereço | `pickup`), `payment`, `items: OrderItem[]` (snapshot), `subtotal`, `deliveryFee`, `total`, `status`, timestamps.
- `Order.place(input, restaurant, catalogSnapshot)` aplica BR-003.1…003.6.
- `WhatsAppMessage` (domain service): função pura `formatOrderMessage(order, restaurant)` + `buildWhatsAppUrl(phone, text)`.

## Caso de uso
`PlaceOrder(slug, input)`:
1. Busca restaurante por slug (404).
2. Carrega os produtos pedidos (`findProductsByIds(restaurantId, ids)`).
3. `orders.nextNumber(restaurantId)` (incremento atômico no D1).
4. `Order.place(...)`, salva, publica `order.created` no `OrderNotifier`.
5. Retorna `{ order, whatsappUrl }`.

## HTTP
`POST /api/public/:slug/orders` → 201 `{ order, whatsappUrl }`

## Web
Carrinho em `localStorage` por slug; drawer do carrinho; página de checkout; tela de sucesso com botão "Enviar pedido no WhatsApp" (abre automaticamente quando o navegador permite).
