-- ============================================================
-- Esencia Concreta — Datos iniciales (migración del catálogo hardcodeado)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere haber corrido antes supabase/schema.sql
-- ============================================================

-- ============ CATEGORÍAS ============
insert into categories (id, label, has_aroma) values
  ('velas',            'Velas',            true),
  ('bandejas',         'Bandejas',         false),
  ('portavelas',       'Portavelas',       false),
  ('floreros',         'Floreros',         false),
  ('posavasos',        'Posavasos',        false),
  ('portasahumerios',  'Portasahumerios',  false);

-- ============ AROMAS ============
insert into aromas (name) values
  ('Sándalo'), ('Lavanda'), ('Vainilla'), ('Coco'),
  ('Vainilla y cedro'), ('Capuchino'), ('Verbena'), ('Limón');

-- ============ PRODUCTOS ============
insert into products (id, sku, category_id, name, short_desc, long_desc, price, featured, active) values
  ('vela-bruma',          'EC-VEL-001', 'velas',           'Vela Bruma',
    'Vela de soja, aroma sándalo. 40h de luz cálida.',
    'Cera de soja 100% natural con mecha de algodón. Vaso de hormigón reutilizable. Aproximadamente 40 horas de combustión limpia.',
    9900, true, true),
  ('vela-niebla',         'EC-VEL-002', 'velas',           'Vela Doble Mecha Niebla',
    'Dos mechas, encendido parejo.',
    'Doble mecha para un encendido uniforme y mayor difusión del aroma. Cera de soja en vaso de hormigón macizo de gran formato.',
    14500, false, true),
  ('portavela-cilindro',  'EC-PTV-001', 'portavelas',      'Portavela Cilíndrico',
    'Hormigón pulido para vela de té.',
    'Cilindro de hormigón pulido pensado para velas de té. Peso justo para una base estable y tacto suave tras el lijado a mano.',
    7200, true, true),
  ('portavela-trio',      'EC-PTV-002', 'portavelas',      'Set Portavelas Trío',
    'Tres alturas en hormigón.',
    'Tres portavelas de distintas alturas para armar composiciones equilibradas. Acabado mate sellado a mano.',
    16800, false, true),
  ('bandeja-organica',    'EC-BAN-001', 'bandejas',        'Bandeja Orgánica',
    'Forma orgánica en cemento.',
    'Bandeja de bordes orgánicos en hormigón fino. Ideal como vaciabolsillos u organizador. Sellada para resistir el uso diario.',
    13900, true, true),
  ('bandeja-rect',        'EC-BAN-002', 'bandejas',        'Bandeja Rectangular Minimal',
    'Líneas rectas y limpias.',
    'Bandeja rectangular de líneas puras, pensada para perfumes, velas o el ritual del café. Hormigón macizo con base antideslizante.',
    11500, false, true),
  ('florero-tubo',        'EC-FLO-001', 'floreros',        'Florero Tubo',
    'Hormigón con tubo de vidrio interior.',
    'Florero escultórico de hormigón con tubo de vidrio interior extraíble. Para una flor única o un ramo pequeño y seco.',
    15900, true, true),
  ('florero-bombe',       'EC-FLO-002', 'floreros',        'Florero Bombé',
    'Silueta redondeada y generosa.',
    'Silueta bombé de presencia escultórica para el centro de la mesa. Interior sellado, apto para agua y flores frescas.',
    18900, false, true),
  ('posavasos-cuarteto',  'EC-POS-001', 'posavasos',       'Posavasos Cuarteto',
    'Set x4 en hormigón con base de corcho.',
    'Juego de cuatro posavasos de hormigón con base de corcho que protege tus superficies. Absorben la humedad y suman textura.',
    8900, true, true),
  ('posavasos-terrazo',   'EC-POS-002', 'posavasos',       'Posavasos Terrazo',
    'Set x4 con detalle terrazo.',
    'Cuatro posavasos con incrustaciones tipo terrazo: ninguno es igual al otro. Sellados y con base de corcho.',
    10500, false, true),
  ('sahumerio-lineal',    'EC-SAH-001', 'portasahumerios', 'Portasahumerio Lineal',
    'Base de hormigón para varillas.',
    'Base lineal de hormigón con canal que recoge la ceniza de las varillas. Minimalista y estable para tu ritual diario.',
    6900, true, true),
  ('sahumerio-cuenco',    'EC-SAH-002', 'portasahumerios', 'Portasahumerio Cuenco',
    'Cuenco con orificio central.',
    'Cuenco de hormigón con orificio central, compatible con varillas y conos de incienso. La forma contiene la ceniza con prolijidad.',
    8500, false, true);

-- ============ COLORES POR PRODUCTO (orden = orden original) ============
insert into product_colors (product_id, color_name) values
  ('vela-bruma','Arena'), ('vela-bruma','Cemento'), ('vela-bruma','Blanco'),
  ('vela-niebla','Cemento'), ('vela-niebla','Carbón'),
  ('portavela-cilindro','Cemento'), ('portavela-cilindro','Arena'), ('portavela-cilindro','Negro'),
  ('portavela-trio','Cemento'), ('portavela-trio','Arena'),
  ('bandeja-organica','Cemento'), ('bandeja-organica','Arena'), ('bandeja-organica','Blanco'),
  ('bandeja-rect','Cemento'), ('bandeja-rect','Negro'),
  ('florero-tubo','Cemento'), ('florero-tubo','Arena'),
  ('florero-bombe','Cemento'), ('florero-bombe','Blanco'),
  ('posavasos-cuarteto','Cemento'), ('posavasos-cuarteto','Arena'), ('posavasos-cuarteto','Negro'),
  ('posavasos-terrazo','Terrazo claro'), ('posavasos-terrazo','Terrazo oscuro'),
  ('sahumerio-lineal','Cemento'), ('sahumerio-lineal','Arena'),
  ('sahumerio-cuenco','Cemento'), ('sahumerio-cuenco','Negro');

-- ============ AROMAS POR PRODUCTO (solo velas) ============
insert into product_aromas (product_id, aroma_name) values
  ('vela-bruma','Sándalo'), ('vela-bruma','Lavanda'), ('vela-bruma','Vainilla'), ('vela-bruma','Coco'),
  ('vela-niebla','Vainilla y cedro'), ('vela-niebla','Capuchino'), ('vela-niebla','Verbena'), ('vela-niebla','Limón');

-- ============ STOCK POR VARIANTE ============
-- vela-bruma (aromatizada): reparto equivalente al normStock() original
insert into stock (product_id, color_name, aroma_name, quantity) values
  ('vela-bruma','Arena','Sándalo',2), ('vela-bruma','Arena','Lavanda',1), ('vela-bruma','Arena','Vainilla',1), ('vela-bruma','Arena','Coco',2),
  ('vela-bruma','Cemento','Sándalo',1), ('vela-bruma','Cemento','Lavanda',1), ('vela-bruma','Cemento','Vainilla',1), ('vela-bruma','Cemento','Coco',0),
  ('vela-bruma','Blanco','Sándalo',1), ('vela-bruma','Blanco','Lavanda',1), ('vela-bruma','Blanco','Vainilla',1), ('vela-bruma','Blanco','Coco',0);

-- vela-niebla (aromatizada)
insert into stock (product_id, color_name, aroma_name, quantity) values
  ('vela-niebla','Cemento','Vainilla y cedro',1), ('vela-niebla','Cemento','Capuchino',1), ('vela-niebla','Cemento','Verbena',1), ('vela-niebla','Cemento','Limón',1),
  ('vela-niebla','Carbón','Vainilla y cedro',1), ('vela-niebla','Carbón','Capuchino',1), ('vela-niebla','Carbón','Verbena',1), ('vela-niebla','Carbón','Limón',1);

-- productos sin aroma: aroma_name = null
insert into stock (product_id, color_name, aroma_name, quantity) values
  ('portavela-cilindro','Cemento',null,8), ('portavela-cilindro','Arena',null,6), ('portavela-cilindro','Negro',null,6),
  ('portavela-trio','Cemento',null,3), ('portavela-trio','Arena',null,3),
  ('bandeja-organica','Cemento',null,4), ('bandeja-organica','Arena',null,3), ('bandeja-organica','Blanco',null,3),
  ('bandeja-rect','Cemento',null,5), ('bandeja-rect','Negro',null,4),
  ('florero-tubo','Cemento',null,4), ('florero-tubo','Arena',null,3),
  ('florero-bombe','Cemento',null,3), ('florero-bombe','Blanco',null,2),
  ('posavasos-cuarteto','Cemento',null,5), ('posavasos-cuarteto','Arena',null,5), ('posavasos-cuarteto','Negro',null,5),
  ('posavasos-terrazo','Terrazo claro',null,6), ('posavasos-terrazo','Terrazo oscuro',null,5),
  ('sahumerio-lineal','Cemento',null,9), ('sahumerio-lineal','Arena',null,9),
  ('sahumerio-cuenco','Cemento',null,5), ('sahumerio-cuenco','Negro',null,4);

-- ============ FOTOS (apuntan a las imágenes estáticas actuales en uploads/) ============
insert into product_photos (product_id, color_name, url, sort_order) values
  ('vela-bruma', null, 'uploads/products/vela-bruma.jpg', 0),
  ('vela-niebla', null, 'uploads/products/vela-niebla.jpg', 0),
  ('portavela-cilindro', null, 'uploads/products/portavela-cilindro.jpg', 0),
  ('portavela-trio', null, 'uploads/products/portavela-trio.jpg', 0),
  ('bandeja-organica', null, 'uploads/products/bandeja-organica.jpg', 0),
  ('bandeja-rect', null, 'uploads/products/bandeja-rect.jpg', 0),
  ('florero-tubo', null, 'uploads/products/florero-tubo.jpg', 0),
  ('florero-bombe', null, 'uploads/products/florero-bombe.jpg', 0),
  ('posavasos-cuarteto', null, 'uploads/products/posavasos-cuarteto.jpg', 0),
  ('posavasos-terrazo', null, 'uploads/products/posavasos-terrazo.jpg', 0),
  ('sahumerio-lineal', null, 'uploads/products/sahumerio-lineal.jpg', 0),
  ('sahumerio-cuenco', null, 'uploads/products/sahumerio-cuenco.jpg', 0);
