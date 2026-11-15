# Constitution — Comandaí

Princípios que toda spec, plano e linha de código respeitam. Mudanças exigem ADR.

## I. Arquitetura

1. **Clean Architecture** com regra de dependência para dentro: `interface → application → domain`; `infrastructure` implementa ports. O `domain` é TypeScript puro.
2. **Composition root único** (`apps/api/src/main.ts`) conhece D1, KV, Durable Objects e crypto.
3. **Recursos da Cloudflare atrás de ports**: `ImageStorage` (Workers KV — ADR-0006), `OrderNotifier` (Durable Objects), `PasswordHasher`/`TokenService` (WebCrypto). Testes usam implementações em memória.

## II. Multi-tenant

1. Todo dado de negócio pertence a um `restaurantId`.
2. Rotas administrativas obtêm o `restaurantId` **somente do token**, nunca do corpo ou da URL.
3. Repositórios exigem `restaurantId` em toda leitura/escrita administrativa. Recurso de outro tenant responde **404** (não revela existência).

## III. Dinheiro e pedidos

1. Valores em **centavos inteiros** (`*Cents`).
2. **O servidor é a fonte do preço**: o cliente envia `productId` + quantidade; preço, nome e disponibilidade vêm do banco no momento do pedido.
3. O pedido guarda um **snapshot** dos itens (nome e preço da época). Editar o cardápio depois não altera pedidos antigos.
4. Mudanças de status seguem a **máquina de estados** do domínio — nenhum `UPDATE status` fora dela.

## IV. Qualidade

1. TypeScript `strict`, sem `any`.
2. Erros de domínio tipados (`code`) e traduzidos para HTTP num único lugar.
3. Contratos Zod compartilhados em `packages/contracts`.
4. Cada `AC` tem ao menos um teste com o ID no nome. Domínio e casos de uso testados sem I/O.

## V. Segurança

1. Senhas com PBKDF2-SHA256 (100k iterações, salt aleatório) via WebCrypto.
2. Sessão via JWT HS256 de curta duração (12h) com `sub` e `rid` (restaurantId).
3. Upload de imagem: só `image/jpeg|png|webp`, máx. 2 MB, chave gerada pelo servidor.
4. Endpoint público de pedido com limite de itens e de quantidade para evitar abuso.
