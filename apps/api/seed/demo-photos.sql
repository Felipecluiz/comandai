-- Fotos dos produtos de demonstração (Unsplash License). Seguro para produção:
-- só atualiza image_key dos produtos da Pizzaria do Zé, não apaga nada.
-- cd apps/api && npx wrangler d1 execute comandai-db --remote --file=seed/demo-photos.sql
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1542282811-943ef1a977c3?auto=format&fit=crop&w=600&q=70' WHERE id = 'prod-calabresa' AND restaurant_id = 'rest-demo-0001';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1595026506669-1e937fc6b9e6?auto=format&fit=crop&w=600&q=70' WHERE id = 'prod-margherita' AND restaurant_id = 'rest-demo-0001';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1594179047502-07fb8a5451f6?auto=format&fit=crop&w=600&q=70' WHERE id = 'prod-portuguesa' AND restaurant_id = 'rest-demo-0001';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1572455021453-7d0b208ae250?auto=format&fit=crop&w=600&q=70' WHERE id = 'prod-frango' AND restaurant_id = 'rest-demo-0001';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1597715469889-dd75fe4a1765?auto=format&fit=crop&w=600&q=70' WHERE id = 'prod-quatro' AND restaurant_id = 'rest-demo-0001';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1753125024862-d08682e24d2c?auto=format&fit=crop&w=600&q=70' WHERE id = 'prod-esf-carne' AND restaurant_id = 'rest-demo-0001';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1716591111290-215dfc6876d2?auto=format&fit=crop&w=600&q=70' WHERE id = 'prod-esf-queijo' AND restaurant_id = 'rest-demo-0001';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1650316710473-8b2ecdcd2b10?auto=format&fit=crop&w=600&q=70' WHERE id = 'prod-suco' AND restaurant_id = 'rest-demo-0001';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1768260731727-275f15ed2556?auto=format&fit=crop&w=600&q=70' WHERE id = 'prod-petit' AND restaurant_id = 'rest-demo-0001';
UPDATE products SET image_key = 'https://images.unsplash.com/flagged/photo-1557234985-425e10c9d7f1?auto=format&fit=crop&w=600&q=70' WHERE id = 'prod-brigadeiro' AND restaurant_id = 'rest-demo-0001';
