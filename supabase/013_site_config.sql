-- ============================================================
-- Esencia Concreta — Config del sitio (datos de transferencia y envío)
-- persistida en Supabase en vez de hardcodeada en el frontend.
-- Mismo patrón que site_content (008): fila única, lectura pública
-- (se necesita mostrar en el checkout), escritura solo admin.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

create table if not exists site_config (
  id int primary key default 1,
  shipping integer not null default 0,
  alias text not null default '',
  cbu text not null default '',
  titular text not null default '',
  whatsapp text not null default '',
  constraint site_config_single_row check (id = 1)
);

insert into site_config (id, shipping, alias, cbu, titular, whatsapp)
values (1, 5000, 'esencia.concreta', '0000003100093421750001', 'María Pérez', '5493492583885')
on conflict (id) do nothing;

alter table site_config enable row level security;
create policy "site_config_public_read" on site_config for select using (true);
create policy "site_config_admin_update" on site_config for update using (is_admin());
