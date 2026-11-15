# 001 — Plan

## Domínio
- `Restaurant`: `id`, `slug: Slug`, `name`, `whatsapp: Phone`, `settings` (`deliveryFeeCents`, `minOrderCents`, `acceptsDelivery`, `acceptsPickup`, `isOpen`), `orderSequence`.
- `Owner`: `id`, `restaurantId`, `email: Email`, `passwordHash`.
- VOs: `Slug`, `Phone`, `Email`.

## Ports
`PasswordHasher { hash, verify }`, `TokenService { sign, verify }`.

## Casos de uso
`RegisterRestaurant`, `Login`, `GetMyRestaurant`, `UpdateRestaurantSettings`.

## HTTP
| Método | Rota | Auth |
|---|---|---|
| POST | `/api/auth/register` | — |
| POST | `/api/auth/login` | — |
| GET | `/api/admin/restaurant` | Bearer |
| PATCH | `/api/admin/restaurant` | Bearer |

## Infra
- `Pbkdf2PasswordHasher` (WebCrypto), formato `pbkdf2$<iter>$<saltB64>$<hashB64>`.
- `JwtTokenService` (`hono/jwt`, segredo em `JWT_SECRET` via `wrangler secret`).
- Middleware `requireAuth` coloca `{ ownerId, restaurantId }` no contexto.
