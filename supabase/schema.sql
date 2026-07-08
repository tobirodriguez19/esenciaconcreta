-- ============================================================
-- Esencia Concreta — Esquema inicial de base de datos
-- Ejecutar completo en: Supabase Dashboard > SQL Editor > New query
-- Proyecto: gxpcinzroocvgvvfpufg
-- ============================================================

-- ============================================================
-- 1. EXTENSIONES
-- ============================================================
create extension if not exists "pgcrypto"; -- para gen_random_uuid()

-- ============================================================
-- 2. PROFILES (perfil + rol, ligado a auth.users)
-- ============================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'cliente' check (role in ('admin','cliente')),
  created_at  timestamptz not null default now()
);

-- Crea automáticamente un profile cuando alguien se registra en auth.users
create function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- 3. CATEGORÍAS
-- ============================================================
create table categories (
  id         text primary key,
  label      text not null,
  has_aroma  boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4. PRODUCTOS
-- ============================================================
create table products (
  id          text primary key,
  sku         text unique,
  category_id text references categories(id) on delete set null,
  name        text not null,
  short_desc  text,
  long_desc   text,
  price       integer not null check (price >= 0),
  featured    boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_products_category on products(category_id);
create index idx_products_active on products(active);

-- updated_at automático
create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

-- ============================================================
-- 5. COLORES Y FOTOS POR PRODUCTO
-- ============================================================
create table product_colors (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references products(id) on delete cascade,
  color_name  text not null,
  unique(product_id, color_name)
);

create index idx_product_colors_product on product_colors(product_id);

create table product_photos (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references products(id) on delete cascade,
  color_name  text,                 -- null = foto general del producto
  url         text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_product_photos_product on product_photos(product_id);

-- ============================================================
-- 6. AROMAS
-- ============================================================
create table aromas (
  name       text primary key,
  created_at timestamptz not null default now()
);

create table product_aromas (
  product_id  text not null references products(id) on delete cascade,
  aroma_name  text not null references aromas(name) on delete cascade,
  primary key (product_id, aroma_name)
);

create index idx_product_aromas_product on product_aromas(product_id);

-- ============================================================
-- 7. STOCK
-- ============================================================
create table stock (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references products(id) on delete cascade,
  color_name  text not null,
  aroma_name  text,                 -- null si el producto no tiene aroma
  quantity    integer not null default 0 check (quantity >= 0),
  updated_at  timestamptz not null default now(),
  unique(product_id, color_name, aroma_name)
);

create index idx_stock_product on stock(product_id);

create trigger trg_stock_updated_at
  before update on stock
  for each row execute function set_updated_at();

-- ============================================================
-- 8. HISTORIAL DE MOVIMIENTOS DE STOCK
-- ============================================================
create table stock_movements (
  id            uuid primary key default gen_random_uuid(),
  product_id    text not null references products(id) on delete cascade,
  color_name    text not null,
  aroma_name    text,
  movement_type text not null check (movement_type in ('entrada','salida','ajuste','venta','cancelacion')),
  quantity      integer not null,   -- delta: positivo (entrada/ajuste+) o negativo (salida/venta)
  reason        text,
  performed_by  uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index idx_stock_movements_product on stock_movements(product_id);
create index idx_stock_movements_created_at on stock_movements(created_at desc);

-- ============================================================
-- 9. CLIENTES
-- ============================================================
create table customers (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid references auth.users(id) on delete set null,
  name          text,
  last_name     text,
  email         text,
  phone         text,
  address       text,
  created_at    timestamptz not null default now()
);

create index idx_customers_auth_user on customers(auth_user_id);
create index idx_customers_email on customers(email);

-- ============================================================
-- 10. VENTAS
-- ============================================================
create table sales (
  id              serial primary key,
  seq             text,
  customer_id     uuid references customers(id) on delete set null,
  channel         text not null default 'online' check (channel in ('online','presencial')),
  total           integer not null check (total >= 0),
  payment_method  text,
  pay_status      text not null default 'pendiente' check (pay_status in ('pendiente','pagado')),
  delivery_status text not null default 'pendiente' check (delivery_status in ('pendiente','entregado')),
  cancelled       boolean not null default false,
  address         text,
  notes           text,
  created_at      timestamptz not null default now()
);

create index idx_sales_customer on sales(customer_id);
create index idx_sales_created_at on sales(created_at desc);

create table sale_items (
  id          uuid primary key default gen_random_uuid(),
  sale_id     int not null references sales(id) on delete cascade,
  product_id  text references products(id) on delete set null,
  color_name  text,
  aroma_name  text,
  quantity    integer not null check (quantity > 0),
  unit_price  integer not null check (unit_price >= 0)
);

create index idx_sale_items_sale on sale_items(sale_id);
create index idx_sale_items_product on sale_items(product_id);

-- ============================================================
-- 11. FUNCIÓN HELPER is_admin()
-- ============================================================
create function is_admin() returns boolean
language sql security definer stable as $$
  select exists(
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- 12. ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_colors enable row level security;
alter table product_photos enable row level security;
alter table aromas enable row level security;
alter table product_aromas enable row level security;
alter table stock enable row level security;
alter table stock_movements enable row level security;
alter table customers enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;

-- ---------- profiles ----------
create policy "profiles_select_own_or_admin" on profiles
  for select using (id = auth.uid() or is_admin());
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

-- ---------- categories (lectura pública, escritura admin) ----------
create policy "categories_public_read" on categories
  for select using (true);
create policy "categories_admin_write" on categories
  for insert with check (is_admin());
create policy "categories_admin_update" on categories
  for update using (is_admin());
create policy "categories_admin_delete" on categories
  for delete using (is_admin());

-- ---------- products (lectura pública SOLO activos, admin ve todo, escritura admin) ----------
create policy "products_public_read_active" on products
  for select using (active = true or is_admin());
create policy "products_admin_insert" on products
  for insert with check (is_admin());
create policy "products_admin_update" on products
  for update using (is_admin());
create policy "products_admin_delete" on products
  for delete using (is_admin());

-- ---------- product_colors ----------
create policy "product_colors_public_read" on product_colors
  for select using (true);
create policy "product_colors_admin_write" on product_colors
  for insert with check (is_admin());
create policy "product_colors_admin_update" on product_colors
  for update using (is_admin());
create policy "product_colors_admin_delete" on product_colors
  for delete using (is_admin());

-- ---------- product_photos ----------
create policy "product_photos_public_read" on product_photos
  for select using (true);
create policy "product_photos_admin_write" on product_photos
  for insert with check (is_admin());
create policy "product_photos_admin_update" on product_photos
  for update using (is_admin());
create policy "product_photos_admin_delete" on product_photos
  for delete using (is_admin());

-- ---------- aromas ----------
create policy "aromas_public_read" on aromas
  for select using (true);
create policy "aromas_admin_write" on aromas
  for insert with check (is_admin());
create policy "aromas_admin_update" on aromas
  for update using (is_admin());
create policy "aromas_admin_delete" on aromas
  for delete using (is_admin());

-- ---------- product_aromas ----------
create policy "product_aromas_public_read" on product_aromas
  for select using (true);
create policy "product_aromas_admin_write" on product_aromas
  for insert with check (is_admin());
create policy "product_aromas_admin_delete" on product_aromas
  for delete using (is_admin());

-- ---------- stock (lectura pública para calcular disponibilidad, escritura solo admin) ----------
create policy "stock_public_read" on stock
  for select using (true);
create policy "stock_admin_write" on stock
  for insert with check (is_admin());
create policy "stock_admin_update" on stock
  for update using (is_admin());
create policy "stock_admin_delete" on stock
  for delete using (is_admin());

-- ---------- stock_movements (solo admin, ninguna lectura/escritura pública) ----------
create policy "stock_movements_admin_all" on stock_movements
  for all using (is_admin()) with check (is_admin());

-- ---------- customers (cada uno ve/edita lo suyo; admin ve todo; alta pública controlada) ----------
create policy "customers_select_own_or_admin" on customers
  for select using (auth_user_id = auth.uid() or is_admin());
create policy "customers_update_own_or_admin" on customers
  for update using (auth_user_id = auth.uid() or is_admin());
create policy "customers_insert_public" on customers
  for insert with check (true); -- necesario para que el checkout cree el registro sin login

-- ---------- sales (protegidas: solo admin) ----------
create policy "sales_admin_all" on sales
  for all using (is_admin()) with check (is_admin());

-- ---------- sale_items (protegidas: solo admin) ----------
create policy "sale_items_admin_all" on sale_items
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- 13. NOTA SOBRE EL CHECKOUT PÚBLICO
-- ============================================================
-- Las políticas de "sales"/"sale_items" son solo-admin a propósito:
-- un cliente anónimo NO puede insertar filas directamente en esas tablas.
-- El checkout va a crear el pedido a través de una función RPC
-- (security definer) que se agrega en el paso 6 de la implementación,
-- para no exponer lectura/escritura libre de ventas de otros clientes.
