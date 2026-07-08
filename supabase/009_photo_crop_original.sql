-- ============================================================
-- Esencia Concreta — Guarda el original de una foto para poder
-- deshacer un recorte (el editor de imágenes sube una versión
-- recortada nueva y conserva la original en esta columna).
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

alter table product_photos add column if not exists original_url text;
