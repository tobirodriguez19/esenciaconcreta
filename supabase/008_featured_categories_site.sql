-- ============================================================
-- Esencia Concreta — Orden real de Destacados y Categorías + contenido de Inicio
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ---------- Destacados: orden persistido en products ----------
alter table products add column if not exists featured_order int;

with ranked as (
  select id, row_number() over (order by id) as rn
  from products where featured = true
)
update products p set featured_order = r.rn from ranked r where p.id = r.id and p.featured_order is null;

-- ---------- Orden de categorías en el menú principal ----------
alter table categories add column if not exists sort_order int not null default 0;

with ranked as (
  select id, row_number() over (order by id) - 1 as rn from categories
)
update categories c set sort_order = r.rn from ranked r where c.id = r.id;

-- ---------- Contenido editable de "Inicio" (El oficio) ----------
create table if not exists site_content (
  id int primary key default 1,
  oficio_eyebrow text not null default 'El oficio',
  oficio_title text not null default 'Hecho artesanalmente',
  oficio_body text not null default '',
  oficio_steps jsonb not null default '[]'::jsonb,
  oficio_photo_url text,
  updated_at timestamptz not null default now(),
  constraint site_content_single_row check (id = 1)
);

insert into site_content (id, oficio_eyebrow, oficio_title, oficio_body, oficio_steps)
values (
  1, 'El oficio', 'Hecho artesanalmente',
  'Cada pieza nace de una mezcla precisa de cemento, agua y pigmento natural. Moldeada, curada y lijada a mano, una por una. No hay dos iguales: las pequeñas variaciones son la firma del oficio.',
  '[{"title":"Mezcla & moldeado","desc":"Dosificamos el hormigón y lo vertimos en moldes propios."},{"title":"Curado & lijado","desc":"Reposo de 48 horas y lijado manual hasta el tacto justo."},{"title":"Sellado a mano","desc":"Hidrolaca protectora que realza la textura del cemento."}]'::jsonb
)
on conflict (id) do nothing;

alter table site_content enable row level security;
create policy "site_content_public_read" on site_content for select using (true);
create policy "site_content_admin_update" on site_content for update using (is_admin());
