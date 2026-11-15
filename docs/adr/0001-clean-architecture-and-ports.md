# ADR-0001 — Clean Architecture com recursos Cloudflare atrás de ports

**Status:** Aceita

## Contexto
O Comandaí usa D1, KV, Durable Objects e WebCrypto. Usá-los direto nos handlers acoplaria a regra de negócio à plataforma e tornaria o pedido (parte mais crítica) difícil de testar.

## Decisão
- `domain/`: entidades (`Restaurant`, `Product`, `Order`…), VOs e serviços puros (mensagem do WhatsApp).
- `application/`: casos de uso + ports (`ImageStorage`, `OrderNotifier`, `PasswordHasher`, `TokenService`, `Clock`, `IdGenerator`, `DashboardQueries`).
- `infrastructure/`: `d1/`, `kv/`, `durable-objects/`, `crypto/`, `memory/`.
- `interface/http/`: Hono.
- `main.ts`: composition root + export do Durable Object.

## Consequências
- ✅ Todo o fluxo de pedido é testado em memória em milissegundos.
- ✅ Trocar o storage ou o DO por outro serviço = novo adapter. **Aconteceu:** as fotos saíram do R2 para o KV sem tocar no domínio (ADR-0006).
- ⚠️ Mais arquivos que um CRUD "direto no handler".
