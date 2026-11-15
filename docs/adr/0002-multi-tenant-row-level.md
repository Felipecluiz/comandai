# ADR-0002 — Multi-tenant por coluna (`restaurant_id`)

**Status:** Aceita

## Opções
1. Um banco D1 por restaurante.
2. Banco único com `restaurant_id` em todas as tabelas.

## Decisão
Opção 2. O `restaurantId` vem **só do JWT** nas rotas admin e é parâmetro obrigatório dos métodos de repositório. Índices compostos começam por `restaurant_id`.

## Consequências
- ✅ Simples de migrar e de agregar (dashboard da plataforma no futuro).
- ✅ Esquecer o filtro é difícil: a assinatura do repositório exige o tenant.
- ⚠️ Isolamento é lógico, não físico. Para clientes enterprise, a opção 1 continua possível trocando o adapter.
