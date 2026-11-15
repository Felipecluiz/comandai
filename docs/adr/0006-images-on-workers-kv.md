# ADR-0006 — Fotos dos produtos no Workers KV (substitui R2)

**Status:** Aceita · **Substitui** a escolha de R2 citada na ADR-0001 e na spec 002

## Contexto
As fotos ficavam no R2. Para ativar o R2, a Cloudflare exige cadastrar uma forma de pagamento, mesmo dentro do plano gratuito. Para um projeto de portfólio, isso é uma barreira: qualquer pessoa que quiser clonar e publicar o projeto precisaria cadastrar cartão.

## Opções consideradas
| Opção | Prós | Contras |
|---|---|---|
| **R2** | Feito para objetos; sem limite prático | Exige forma de pagamento |
| **Workers KV** | Grátis sem cartão; valores até 25 MiB; cache no edge | 1.000 escritas/dia e 1 GB no plano gratuito; consistência eventual (~60s) |
| BLOB no D1 | Mesmo banco | Linhas grandes pesam nas queries e nos backups |
| Só URL externa | Trivial | Perde o upload; links quebram |

## Decisão
Usar **Workers KV** através de um novo adapter, `KvImageStorage`, que implementa o port `ImageStorage` já existente.

- Chave: `<restaurantId>/<productId>-<uuid>.<ext>` (inalterada).
- `Content-Type` guardado nos metadados da chave.
- Leitura com `cacheTtl` de 1 dia no edge + `Cache-Control: immutable` no navegador: cada upload gera uma chave nova, então nunca há versão desatualizada.

## Consequências
- ✅ **Nenhuma mudança em `domain/` ou `application/`**: só o adapter, o binding e a rota que serve as imagens. É exatamente o cenário que a ADR-0001 previa.
- ✅ Deploy 100% gratuito e sem cartão.
- ✅ No plano gratuito, operações acima do limite **falham** em vez de gerar cobrança.
- ⚠️ 1.000 uploads por dia por conta. Suficiente para portfólio e restaurantes pequenos; acima disso, voltar ao R2 é trocar o adapter de novo.
- ⚠️ Uma foto recém-enviada pode levar alguns segundos para aparecer em outras regiões. Como a chave é nova a cada upload, nunca aparece uma foto errada; no pior caso, ela demora um pouco a carregar.
