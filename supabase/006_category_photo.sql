-- ============================================================
-- Esencia Concreta — Foto real por categoría (Supabase Storage)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

alter table categories add column if not exists photo_url text;
