# ADR-0003 — Envio para WhatsApp via link `wa.me`

**Status:** Aceita

## Contexto
O pedido precisa chegar ao WhatsApp do restaurante. Opções: WhatsApp Cloud API (envio pelo servidor) ou link `https://wa.me/<numero>?text=<msg>` aberto pelo cliente.

## Decisão
Link `wa.me`. O pedido é **sempre salvo antes** no painel; o link é um canal extra de notificação.

## Consequências
- ✅ Zero custo e sem aprovação de templates da Meta — qualquer restaurante usa no primeiro minuto.
- ✅ O cliente fica com o histórico da conversa no próprio WhatsApp.
- ⚠️ Depende do cliente tocar em "enviar". Mitigação: o painel em tempo real (spec 004) não depende disso.
- 🔁 A formatação vive num serviço de domínio puro (`formatOrderMessage`); migrar para a Cloud API é implementar um `OrderNotifier` novo que reusa a mesma mensagem.
