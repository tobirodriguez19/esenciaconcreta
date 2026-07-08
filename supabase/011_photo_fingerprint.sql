-- ============================================================
-- Esencia Concreta — Hash del contenido de cada foto, para detectar
-- y evitar subir la misma imagen dos veces al mismo producto/color.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

alter table product_photos add column if not exists fingerprint text;
create index if not exists idx_product_photos_fingerprint on product_photos(product_id, color_name, fingerprint);
