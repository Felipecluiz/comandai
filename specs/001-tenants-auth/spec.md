# 001 — Restaurantes e acesso · Spec

**Status:** Implementada

## Contexto
Cada restaurante se cadastra, ganha um link público (`/r/<slug>`) e um painel privado.

## User stories
- **US-001.1** Como dono, quero cadastrar meu restaurante com nome, link, WhatsApp, e-mail e senha.
- **US-001.2** Como dono, quero entrar no painel com e-mail e senha.
- **US-001.3** Como dono, quero configurar taxa de entrega, pedido mínimo, se aceito retirada/entrega e abrir/fechar a loja.

## Regras de negócio
- **BR-001.1** Slug: 3–40 caracteres, `a-z`, `0-9` e `-`, sem hífen nas pontas; único na plataforma. Palavras reservadas (`admin`, `api`, `login`…) são proibidas.
- **BR-001.2** WhatsApp é um celular brasileiro: aceita `(11) 98765-4321`, `+55 11 98765-4321` etc. e é normalizado para `5511987654321`.
- **BR-001.3** E-mail único; senha com no mínimo 8 caracteres.
- **BR-001.4** Login com credenciais erradas retorna o mesmo erro para e-mail inexistente e senha incorreta.
- **BR-001.5** Taxa de entrega e pedido mínimo ≥ 0. Pelo menos um modo (entrega/retirada) deve estar habilitado.

## Critérios de aceite
- **AC-001.1** *When* cadastro "Pizzaria do Zé", slug `pizzaria-do-ze`, WhatsApp `(11) 98765-4321`, *then* 201 com token e restaurante com `whatsapp = 5511987654321`.
- **AC-001.2** *Given* slug `pizzaria-do-ze` existe, *when* cadastro com o mesmo slug, *then* 409 `SLUG_TAKEN`.
- **AC-001.3** *When* slug é `admin` ou `Pizza Zé`, *then* 422.
- **AC-001.4** *When* login com senha errada, *then* 401 `INVALID_CREDENTIALS`.
- **AC-001.5** *When* desabilito entrega e retirada ao mesmo tempo, *then* 422.
- **AC-001.6** *When* acesso `/api/admin/*` sem token válido, *then* 401.
