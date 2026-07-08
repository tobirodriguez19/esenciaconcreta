-- ============================================================
-- Esencia Concreta — Checkout público seguro + gestión de ventas
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere haber corrido antes schema.sql, seed.sql y 002_add_sort_order.sql
-- ============================================================

alter table sales add column if not exists seen boolean not null default true;
alter table sale_items add column if not exists product_name text;

-- ============================================================
-- create_order: usada por el checkout público (cliente anónimo)
-- y por el alta de "venta presencial" desde el panel admin.
-- security definer + dueño de las tablas => puede escribir en
-- sales/sale_items/customers/stock aunque el que llama sea anon,
-- sin necesidad de abrir esas tablas en RLS.
-- ============================================================
create or replace function create_order(
  p_customer jsonb,
  p_items jsonb,
  p_channel text,
  p_payment_method text,
  p_pay_status text,
  p_delivery_status text,
  p_address text,
  p_notes text,
  p_seen boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_customer_id uuid;
  v_sale_id int;
  v_total integer := 0;
  v_item jsonb;
  v_available integer;
  v_pname text;
  v_pprice integer;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no tiene productos';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select quantity into v_available from stock
      where product_id = (v_item->>'product_id')
        and color_name = (v_item->>'color_name')
        and (aroma_name = (v_item->>'aroma_name') or (aroma_name is null and (v_item->>'aroma_name') is null));
    if v_available is null or v_available < (v_item->>'quantity')::int then
      raise exception 'Sin stock suficiente para el producto %', (v_item->>'product_id');
    end if;
  end loop;

  insert into customers(name,last_name,email,phone,address)
    values (p_customer->>'name', p_customer->>'last_name', p_customer->>'email', p_customer->>'phone', p_customer->>'address')
    returning id into v_customer_id;

  insert into sales(customer_id, channel, total, payment_method, pay_status, delivery_status, address, notes, seen)
    values (v_customer_id, p_channel, 0, p_payment_method, p_pay_status, p_delivery_status, p_address, p_notes, p_seen)
    returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select name, price into v_pname, v_pprice from products where id = (v_item->>'product_id');
    v_pprice := coalesce(v_pprice, (v_item->>'unit_price')::int);
    v_total := v_total + (v_item->>'quantity')::int * v_pprice;

    insert into sale_items(sale_id, product_id, product_name, color_name, aroma_name, quantity, unit_price)
      values (v_sale_id, v_item->>'product_id', v_pname, v_item->>'color_name', v_item->>'aroma_name', (v_item->>'quantity')::int, v_pprice);

    update stock set quantity = quantity - (v_item->>'quantity')::int
      where product_id = (v_item->>'product_id')
        and color_name = (v_item->>'color_name')
        and (aroma_name = (v_item->>'aroma_name') or (aroma_name is null and (v_item->>'aroma_name') is null));

    insert into stock_movements(product_id, color_name, aroma_name, movement_type, quantity, reason)
      values (v_item->>'product_id', v_item->>'color_name', v_item->>'aroma_name', 'venta', -((v_item->>'quantity')::int), 'Venta #'||v_sale_id);
  end loop;

  update sales set total = v_total where id = v_sale_id;

  return jsonb_build_object('sale_id', v_sale_id, 'total', v_total, 'customer_id', v_customer_id);
end;
$$;

grant execute on function create_order(jsonb,jsonb,text,text,text,text,text,text,boolean) to anon, authenticated;

-- ============================================================
-- adjust_sale_stock: repone/descuenta el stock de una venta
-- (cancelar / deshacer cancelación). Solo admin.
-- ============================================================
create or replace function adjust_sale_stock(p_sale_id int, p_sign int) returns void
language plpgsql security definer set search_path = public as $$
declare v_item record;
begin
  if not is_admin() then raise exception 'No autorizado'; end if;
  for v_item in select product_id, color_name, aroma_name, quantity from sale_items where sale_id = p_sale_id loop
    update stock set quantity = greatest(0, quantity + p_sign * v_item.quantity)
      where product_id = v_item.product_id and color_name = v_item.color_name
        and (aroma_name = v_item.aroma_name or (aroma_name is null and v_item.aroma_name is null));
    insert into stock_movements(product_id,color_name,aroma_name,movement_type,quantity,reason,performed_by)
      values (v_item.product_id, v_item.color_name, v_item.aroma_name,
              case when p_sign>0 then 'entrada' else 'salida' end, p_sign*v_item.quantity,
              case when p_sign>0 then 'Cancelación de venta #'||p_sale_id else 'Venta reactivada #'||p_sale_id end,
              auth.uid());
  end loop;
end;
$$;

grant execute on function adjust_sale_stock(int,int) to authenticated;

-- ============================================================
-- edit_sale_items: reemplaza los productos de una venta existente
-- y ajusta el stock por la diferencia. Solo admin.
-- ============================================================
create or replace function edit_sale_items(p_sale_id int, p_items jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb; v_total integer := 0; v_pname text; v_pprice integer; v_was_cancelled boolean;
begin
  if not is_admin() then raise exception 'No autorizado'; end if;
  select cancelled into v_was_cancelled from sales where id = p_sale_id;
  if v_was_cancelled is null then raise exception 'Venta no encontrada'; end if;

  if not v_was_cancelled then
    perform adjust_sale_stock(p_sale_id, 1);
  end if;

  delete from sale_items where sale_id = p_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select name, price into v_pname, v_pprice from products where id = (v_item->>'product_id');
    v_pprice := coalesce(v_pprice, 0);
    insert into sale_items(sale_id, product_id, product_name, color_name, aroma_name, quantity, unit_price)
      values (p_sale_id, v_item->>'product_id', v_pname, v_item->>'color_name', v_item->>'aroma_name', (v_item->>'quantity')::int, v_pprice);
    v_total := v_total + (v_item->>'quantity')::int * v_pprice;
  end loop;

  if not v_was_cancelled then
    perform adjust_sale_stock(p_sale_id, -1);
  end if;

  update sales set total = v_total where id = p_sale_id;
  return jsonb_build_object('total', v_total);
end;
$$;

grant execute on function edit_sale_items(int,jsonb) to authenticated;
