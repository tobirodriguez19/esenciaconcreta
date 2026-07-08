-- ============================================================
-- Esencia Concreta — Baja lógica (activo/inactivo) para categorías y aromas
-- Productos ya tenía products.active; esto agrega el mismo patrón a
-- categories y aromas, y actualiza las políticas de lectura pública
-- para que solo vean lo activo (igual que products).
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

alter table categories add column if not exists active boolean not null default true;
alter table aromas add column if not exists active boolean not null default true;

drop policy if exists "categories_public_read" on categories;
create policy "categories_public_read_active" on categories
  for select using (active = true or is_admin());

drop policy if exists "aromas_public_read" on aromas;
create policy "aromas_public_read_active" on aromas
  for select using (active = true or is_admin());
