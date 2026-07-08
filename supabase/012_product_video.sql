-- ============================================================
-- Esencia Concreta — Video opcional por producto (se muestra como
-- una foto más en el carrusel, con botón de play).
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

alter table products add column if not exists video_url text;
