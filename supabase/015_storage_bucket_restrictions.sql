-- ============================================================
-- Esencia Concreta — Restricciones del bucket product-photos
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere haber corrido antes 004_storage_product_photos.sql
--
-- Hoy la validación de tipo/tamaño de archivo es solo JS en el
-- cliente (okTypes/maxBytes en images.js) — bypasseable llamando la
-- API de Storage directo (aunque solo lo puede hacer una sesión admin
-- ya autenticada, por las políticas de 004). Esto agrega la misma
-- restricción a nivel de configuración del bucket, como defensa en
-- profundidad.
-- ============================================================

update storage.buckets
set allowed_mime_types = array['image/jpeg','image/jpg','image/png','image/webp','video/mp4','video/webm','video/quicktime','video/ogg'],
    file_size_limit = 52428800 -- 50MB: el máximo entre fotos (5MB) y video (50MB) que ya valida el cliente
where id = 'product-photos';
