# 002 — Catálogo · Spec

**Status:** Implementada · **Depende de:** 001

## Contexto
O restaurante monta o cardápio: categorias ordenáveis e produtos com foto, descrição e preço.

## User stories
- **US-002.1** Como dono, quero criar, renomear, reordenar e excluir categorias do cardápio.
- **US-002.2** Como dono, quero cadastrar produtos com nome, descrição, preço e foto.
- **US-002.3** Como dono, quero pausar um produto que acabou, sem excluí-lo.
- **US-002.4** Como cliente, quero ver o cardápio público só com o que está disponível.

## Regras de negócio
- **BR-002.1** Nome de categoria 2–40 caracteres, único no restaurante (case-insensitive).
- **BR-002.2** Categoria com produtos não pode ser excluída.
- **BR-002.3** Produto: nome 2–80, descrição até 300, preço > 0 e ≤ R$ 10.000,00.
- **BR-002.4** Produto pertence a uma categoria do **mesmo** restaurante.
- **BR-002.5** Foto: `image/jpeg|png|webp`, até 2 MB. Ao trocar a foto, a anterior é apagada do storage.
- **BR-002.6** Cardápio público omite produtos indisponíveis e categorias vazias, respeitando `position`.

## Critérios de aceite
- **AC-002.1** *When* crio categoria "Pizzas", *then* ela recebe a próxima `position`.
- **AC-002.2** *Given* "Pizzas" tem produtos, *when* excluo, *then* 409 `CATEGORY_NOT_EMPTY`.
- **AC-002.3** *When* crio produto com preço 0, *then* 422.
- **AC-002.4** *When* crio produto em categoria de outro restaurante, *then* 404.
- **AC-002.5** *When* envio um PDF como foto, *then* 422 `INVALID_IMAGE`.
- **AC-002.6** *Given* produto pausado, *when* consulto o cardápio público, *then* ele não aparece.
- **AC-002.7** *When* reordeno categorias com `[c3, c1, c2]`, *then* as posições passam a ser 0, 1, 2 nessa ordem.
