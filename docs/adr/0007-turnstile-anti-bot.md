# ADR-0007 — Verificação anti-robô com Cloudflare Turnstile

**Status:** Aceita · **Spec:** [007-bot-protection](../../specs/007-bot-protection/spec.md)

## Contexto
Três rotas aceitam requisições de qualquer pessoa sem login: cadastro de restaurante, login e envio de pedido no cardápio público. Sem proteção, um script consegue criar lojas falsas em massa, testar senhas em sequência ou encher o painel da cozinha de pedidos falsos, que também gastam a cota gratuita do D1.

## Opções consideradas
| Opção | Prós | Contras |
|---|---|---|
| **Cloudflare Turnstile** | Grátis, sem cartão; na maioria das vezes não pede nada ao usuário; mesma plataforma do resto do projeto | Depende de um script externo no front e de uma chamada ao Siteverify no back |
| reCAPTCHA / hCaptcha | Conhecidos | Desafios visuais frequentes, mais um fornecedor, preocupações de privacidade |
| Só rate limiting no WAF | Nada muda no código | Não distingue pessoa de robô; regras gratuitas são limitadas |

## Decisão
Usar **Turnstile** nas três rotas, seguindo os ports da ADR-0001:

- **Port** `HumanVerifier` em `application/ports.ts`.
- **Adapter** `TurnstileVerifier` em `infrastructure/turnstile/`: chama `POST /turnstile/v0/siteverify` com o secret, o token e o IP (`CF-Connecting-IP`).
- **Middleware** `requireHuman(action)` em `interface/http`: lê o token do header `x-turnstile-token`, roda **depois** da validação do corpo (dados inválidos não gastam o token, que é de uso único) e responde `403 HUMAN_VERIFICATION_FAILED` quando falha.
- **Action por tela** (`register`, `login`, `order`): um token gerado no login não serve para fazer pedido.
- **Falha fechada**: sem secret configurado, sem token, Siteverify fora do ar ou timeout de 5 s → requisição recusada.
- Testes e dev: `TURNSTILE_DISABLED=true` desliga a verificação de forma explícita (testes de integração); localmente usam-se as chaves de teste da Cloudflare.

## Consequências
- ✅ Nenhuma mudança nos casos de uso nem no domínio, além de um código de erro novo.
- ✅ O token vai no header, então os schemas Zod de `@comandai/contracts` continuam iguais.
- ✅ O CI recusa o deploy se faltarem as chaves ou se forem as chaves de teste (que sempre passam).
- ⚠️ Com bloqueador de scripts agressivo o widget pode não carregar; a tela avisa e o envio fica desabilitado.
- ⚠️ Durante o deploy (API nova, front antigo, cerca de um minuto) pedidos enviados pelo front antigo recebem 403.
