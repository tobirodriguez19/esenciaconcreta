-- ============================================================
-- Esencia Concreta — Pedidos por encargo (fabricación a pedido
-- cuando una combinación producto+color+aroma tiene stock 0).
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

alter table products add column if not exists allow_custom_order boolean not null default false;
alter table products add column if not exists custom_order_eta text not null default '';

create table if not exists custom_orders (
  id              bigserial primary key,
  product_id      text references products(id) on delete set null,
  product_name    text not null,
  color_name      text,
  aroma_name      text,
  quantity        integer not null check (quantity > 0),
  customer_name   text not null,
  customer_phone  text not null,
  comment         text,
  status          text not null default 'pendiente' check (status in ('pendiente','en_fabricacion','listo','entregado','cancelado')),
  admin_notes     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_custom_orders_created_at on custom_orders(created_at desc);
create index if not exists idx_custom_orders_status on custom_orders(status);

create trigger trg_custom_orders_updated_at
  before update on custom_orders
  for each row execute function set_updated_at();

alter table custom_orders enable row level security;

-- Alta pública, pero solo para productos que la tienen habilitada
-- (evita pedidos "por encargo" de productos que el admin no marcó para eso).
create policy "custom_orders_public_insert" on custom_orders
  for insert with check (
    exists (select 1 from products where id = product_id and active = true and allow_custom_order = true)
  );

-- Lectura/edición: solo admin (mismo patrón que sales/site_config).
create policy "custom_orders_admin_all" on custom_orders
  for all using (is_admin()) with check (is_admin());
