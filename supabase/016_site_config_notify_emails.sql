-- ============================================================
-- Esencia Concreta — Destinatarios del aviso de venta (EmailJS),
-- editables desde el admin (Ventas > Configuración) en vez de fijos
-- en la plantilla de EmailJS. Mismo patrón que el resto de site_config:
-- lectura pública (el checkout necesita el resto de la config igual),
-- escritura solo admin.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

alter table site_config add column if not exists notify_emails text not null default '';

update site_config set notify_emails = 'tobiirodriguezz19@gmail.com' where id = 1 and notify_emails = '';
