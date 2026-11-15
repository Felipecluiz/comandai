# 003 — Checkout + WhatsApp · Spec

**Status:** Implementada · **Depende de:** 002

## Contexto
O cliente monta o carrinho no cardápio público, informa seus dados e finaliza. O pedido é **salvo no painel** e o cliente é levado ao **WhatsApp do restaurante** com a mensagem pronta (ADR-0003).

## User stories
- **US-003.1** Como cliente, quero adicionar produtos com quantidade e observação ao carrinho.
- **US-003.2** Como cliente, quero escolher entrega ou retirada, forma de pagamento e informar meus dados.
- **US-003.3** Como cliente, quero enviar o pedido pelo WhatsApp com tudo formatado.
- **US-003.4** Como restaurante, quero que o pedido apareça no painel mesmo se o cliente não enviar a mensagem.

## Regras de negócio
- **BR-003.1** Preço, nome e disponibilidade vêm do servidor (constitution III.2). Produto indisponível ou de outro restaurante invalida o pedido.
- **BR-003.2** Loja fechada não aceita pedidos.
- **BR-003.3** Modo (entrega/retirada) precisa estar habilitado; entrega exige endereço.
- **BR-003.4** Subtotal ≥ pedido mínimo. Total = subtotal + taxa de entrega (só na entrega).
- **BR-003.5** 1 a 30 itens distintos; quantidade de 1 a 50; observação até 140 caracteres.
- **BR-003.6** Pagamento: `pix`, `card` ou `cash`. Em dinheiro, `changeForCents` (troco para), se informado, deve ser ≥ total.
- **BR-003.7** Cada pedido recebe um número sequencial **por restaurante** (`#1`, `#2`…).
- **BR-003.8** A mensagem do WhatsApp contém: número do pedido, itens com quantidade/preço/observação, subtotal, taxa, total, modo, endereço, pagamento/troco e nome/telefone do cliente.

## Critérios de aceite
- **AC-003.1** *Given* produto de R$ 40,00 e taxa R$ 5,00, *when* peço 2 com entrega, *then* total = R$ 85,00 e status `pending`.
- **AC-003.2** *When* o cliente manda `priceCents: 1` no item, *then* o campo é ignorado e o preço do banco é usado.
- **AC-003.3** *Given* produto pausado, *then* 422 `PRODUCT_UNAVAILABLE`.
- **AC-003.4** *Given* loja fechada, *then* 422 `RESTAURANT_CLOSED`.
- **AC-003.5** *Given* mínimo R$ 30,00, *when* subtotal é R$ 20,00, *then* 422 `MIN_ORDER_NOT_REACHED`.
- **AC-003.6** *When* entrega sem endereço, *then* 422.
- **AC-003.7** *Given* dois pedidos seguidos, *then* recebem `#1` e `#2`.
- **AC-003.8** *Then* a resposta tem `whatsappUrl = https://wa.me/<whatsapp>?text=<mensagem codificada>`.
- **AC-003.9** *When* pagamento em dinheiro com troco menor que o total, *then* 422.
