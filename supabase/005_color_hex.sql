-- ============================================================
-- Esencia Concreta — Valor hexadecimal opcional por color
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Verificado: product_colors no tenía ninguna columna de color/hex previa.
-- ============================================================

alter table product_colors add column if not exists hex_value text;
