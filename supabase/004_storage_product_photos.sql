-- ============================================================
-- Esencia Concreta — Bucket de Storage para fotos de producto
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

-- Lectura pública (el catálogo es público)
create policy "product_photos_storage_public_read" on storage.objects
  for select using (bucket_id = 'product-photos');

-- Escritura y borrado solo para admin (reusa la función is_admin() de public)
create policy "product_photos_storage_admin_insert" on storage.objects
  for insert with check (bucket_id = 'product-photos' and public.is_admin());

create policy "product_photos_storage_admin_update" on storage.objects
  for update using (bucket_id = 'product-photos' and public.is_admin());

create policy "product_photos_storage_admin_delete" on storage.objects
  for delete using (bucket_id = 'product-photos' and public.is_admin());
