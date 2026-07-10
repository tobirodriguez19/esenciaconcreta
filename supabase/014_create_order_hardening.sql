-- ============================================================
-- Esencia Concreta — Hardening de create_order
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere haber corrido antes 003_sales_rpc.sql
--
-- Cambios:
-- 1) Saca el fallback que confiaba en el precio mandado por el cliente
--    (coalesce con unit_price) — si el producto no existe, ahora falla
--    en vez de aceptar un precio arbitrario. Hoy era un camino
--    inalcanzable (stock tiene FK on delete cascade a products), pero
--    no había que dejar la puerta entreabierta.
-- 2) Agrega p_shipping (default 0) para calcular el total completo de
--    forma atómica en el server. Antes el envío se sumaba con un update
--    directo a sales.total desde el cliente después del RPC, que fallaba
--    silenciosamente para cualquier cliente anónimo (sales solo permite
--    update a is_admin() por RLS) — el total de pedidos con envío
--    quedaba mal guardado.
-- ============================================================

drop function if exists create_order(jsonb,jsonb,text,text,text,text,text,text,boolean);

create or replace function create_order(
  p_customer jsonb,
  p_items jsonb,
  p_channel text,
  p_payment_method text,
  p_pay_status text,
  p_delivery_status text,
  p_address text,
  p_notes text,
  p_seen boolean,
  p_shipping integer default 0
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
    if v_pprice is null then
      raise exception 'Producto % no encontrado', (v_item->>'product_id');
    end if;
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

  v_total := v_total + coalesce(p_shipping, 0);
  update sales set total = v_total where id = v_sale_id;

  return jsonb_build_object('sale_id', v_sale_id, 'total', v_total, 'customer_id', v_customer_id);
end;
$$;

grant execute on function create_order(jsonb,jsonb,text,text,text,text,text,text,boolean,integer) to anon, authenticated;
