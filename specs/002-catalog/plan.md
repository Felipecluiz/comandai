# 002 — Plan

## Domínio
- `MenuCategory`: `id`, `restaurantId`, `name`, `position`.
- `Product`: `id`, `restaurantId`, `categoryId`, `name`, `description`, `price: Money`, `imageKey?`, `available`.
  - `pause()`, `resume()`, `changeImage(key) → previousKey`.

## Ports
- `ImageStorage { put(key, bytes, contentType), delete(key) }` → Workers KV em produção (ADR-0006; antes R2).
- `CatalogRepository` (categorias + produtos, sempre com `restaurantId`).

## Casos de uso
`CreateCategory`, `UpdateCategory`, `ReorderCategories`, `DeleteCategory`, `CreateProduct`, `UpdateProduct`, `DeleteProduct`, `UploadProductImage`, `GetAdminCatalog`, `GetPublicMenu`.

## HTTP
| Método | Rota |
|---|---|
| GET | `/api/admin/catalog` |
| POST/PATCH/DELETE | `/api/admin/categories[/:id]` |
| PUT | `/api/admin/categories/order` |
| POST/PATCH/DELETE | `/api/admin/products[/:id]` |
| PUT | `/api/admin/products/:id/image` (multipart) |
| GET | `/api/public/:slug/menu` (cache 30s) |
| GET | `/api/images/:key` (servido do KV, cache imutável) |
