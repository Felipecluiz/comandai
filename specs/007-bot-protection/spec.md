# 007 — Proteção contra robôs · Spec

**Status:** Implementada · **Decisão técnica:** [ADR-0007](../../docs/adr/0007-turnstile-anti-bot.md)

## Contexto
Cadastro, login e envio de pedido são abertos ao público. Robôs poderiam criar contas falsas, testar senhas e encher o painel da cozinha de pedidos falsos.

## User stories
- **US-007.1** Como dono de restaurante, quero que só pessoas consigam fazer pedidos, para minha cozinha não perder tempo com pedidos falsos.
- **US-007.2** Como cliente, quero fazer o pedido sem resolver quebra-cabeças, para não desistir no meio.

## Regras de negócio
- **BR-007.1** Cadastro, login e envio de pedido exigem uma verificação anti-robô válida.
- **BR-007.2** Cada verificação vale para uma única tentativa e para uma tela específica.
- **BR-007.3** Se não for possível verificar (configuração ausente ou serviço fora do ar), a requisição é recusada.
- **BR-007.4** Dados inválidos são recusados antes da verificação, sem consumi-la.

## Critérios de aceite
- **AC-007.1** *Given* uma requisição de cadastro, login ou pedido sem token *when* ela chega à API *then* a resposta é `403` com `HUMAN_VERIFICATION_FAILED`.
- **AC-007.2** *Given* um token válido para a tela *when* a requisição chega *then* ela segue normalmente.
- **AC-007.3** *Given* um token válido mas gerado para outra tela *when* ele é usado *then* a requisição é recusada.
- **AC-007.4** *Given* um erro qualquer na tentativa *when* a tela exibe o erro *then* o widget gera um token novo antes de permitir outro envio.
- **AC-007.5** *Given* um deploy de produção *when* faltam as chaves ou são as de teste *then* o CI falha antes de publicar.

## Fora de escopo
- Rate limiting por IP (continua recomendado no WAF, ver `docs/DEPLOY.md`).
