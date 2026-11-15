# Specs — Spec-Driven Development

Fonte da verdade do Comandaí. Nenhum código entra sem uma spec que o justifique.

```
constitution ──► spec.md ──► plan.md ──► tasks.md ──► código + testes
   (regras)       (O QUÊ)    (COMO)     (passos)
```

- **IDs rastreáveis**: regras de negócio `BR-xxx.n`, critérios de aceite `AC-xxx.n`. Os testes usam esses IDs no nome.
- **Fluxo**: spec revisada → plan → tasks → implementação em PR pequeno → tasks marcadas.

| ID  | Feature                         | Status          |
|-----|---------------------------------|-----------------|
| 000 | Constitution                    | ✅ Aprovada      |
| 001 | Restaurantes (tenants) e acesso | ✅ Implementada  |
| 002 | Catálogo (categorias, produtos, fotos) | ✅ Implementada |
| 003 | Checkout + WhatsApp             | ✅ Implementada  |
| 004 | Painel de pedidos em tempo real | ✅ Implementada  |
| 005 | Dashboard                       | ✅ Implementada  |
| 006 | Adicionais/complementos         | 📝 Proposta      |

Para uma nova feature: `cp -r specs/_template specs/00X-nome`.
