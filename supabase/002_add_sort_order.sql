-- ============================================================
-- Esencia Concreta — Agrega orden explícito a colores y aromas por producto
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere haber corrido antes schema.sql y seed.sql
-- ============================================================

alter table product_colors add column sort_order int not null default 0;
alter table product_aromas add column sort_order int not null default 0;

-- Fija el orden original (mismo orden en que aparecían en el catálogo hardcodeado)
with ordered as (
  select id, row_number() over (partition by product_id order by color_name) - 1 as rn
  from product_colors
)
update product_colors pc set sort_order = o.rn from ordered o where o.id = pc.id;

-- El paso anterior ordena alfabéticamente como placeholder; fijamos manualmente
-- el orden real de cada producto para que coincida exactamente con el catálogo original.
update product_colors set sort_order = 0 where product_id='vela-bruma' and color_name='Arena';
update product_colors set sort_order = 1 where product_id='vela-bruma' and color_name='Cemento';
update product_colors set sort_order = 2 where product_id='vela-bruma' and color_name='Blanco';

update product_colors set sort_order = 0 where product_id='vela-niebla' and color_name='Cemento';
update product_colors set sort_order = 1 where product_id='vela-niebla' and color_name='Carbón';

update product_colors set sort_order = 0 where product_id='portavela-cilindro' and color_name='Cemento';
update product_colors set sort_order = 1 where product_id='portavela-cilindro' and color_name='Arena';
update product_colors set sort_order = 2 where product_id='portavela-cilindro' and color_name='Negro';

update product_colors set sort_order = 0 where product_id='portavela-trio' and color_name='Cemento';
update product_colors set sort_order = 1 where product_id='portavela-trio' and color_name='Arena';

update product_colors set sort_order = 0 where product_id='bandeja-organica' and color_name='Cemento';
update product_colors set sort_order = 1 where product_id='bandeja-organica' and color_name='Arena';
update product_colors set sort_order = 2 where product_id='bandeja-organica' and color_name='Blanco';

update product_colors set sort_order = 0 where product_id='bandeja-rect' and color_name='Cemento';
update product_colors set sort_order = 1 where product_id='bandeja-rect' and color_name='Negro';

update product_colors set sort_order = 0 where product_id='florero-tubo' and color_name='Cemento';
update product_colors set sort_order = 1 where product_id='florero-tubo' and color_name='Arena';

update product_colors set sort_order = 0 where product_id='florero-bombe' and color_name='Cemento';
update product_colors set sort_order = 1 where product_id='florero-bombe' and color_name='Blanco';

update product_colors set sort_order = 0 where product_id='posavasos-cuarteto' and color_name='Cemento';
update product_colors set sort_order = 1 where product_id='posavasos-cuarteto' and color_name='Arena';
update product_colors set sort_order = 2 where product_id='posavasos-cuarteto' and color_name='Negro';

update product_colors set sort_order = 0 where product_id='posavasos-terrazo' and color_name='Terrazo claro';
update product_colors set sort_order = 1 where product_id='posavasos-terrazo' and color_name='Terrazo oscuro';

update product_colors set sort_order = 0 where product_id='sahumerio-lineal' and color_name='Cemento';
update product_colors set sort_order = 1 where product_id='sahumerio-lineal' and color_name='Arena';

update product_colors set sort_order = 0 where product_id='sahumerio-cuenco' and color_name='Cemento';
update product_colors set sort_order = 1 where product_id='sahumerio-cuenco' and color_name='Negro';

-- Orden de aromas (solo vela-bruma y vela-niebla tienen)
update product_aromas set sort_order = 0 where product_id='vela-bruma' and aroma_name='Sándalo';
update product_aromas set sort_order = 1 where product_id='vela-bruma' and aroma_name='Lavanda';
update product_aromas set sort_order = 2 where product_id='vela-bruma' and aroma_name='Vainilla';
update product_aromas set sort_order = 3 where product_id='vela-bruma' and aroma_name='Coco';

update product_aromas set sort_order = 0 where product_id='vela-niebla' and aroma_name='Vainilla y cedro';
update product_aromas set sort_order = 1 where product_id='vela-niebla' and aroma_name='Capuchino';
update product_aromas set sort_order = 2 where product_id='vela-niebla' and aroma_name='Verbena';
update product_aromas set sort_order = 3 where product_id='vela-niebla' and aroma_name='Limón';
