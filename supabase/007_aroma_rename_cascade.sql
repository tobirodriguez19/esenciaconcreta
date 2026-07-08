-- ============================================================
-- Esencia Concreta — Permite renombrar aromas sin romper la FK
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================
-- product_aromas.aroma_name referencia aromas.name, pero la FK se creó
-- sin ON UPDATE CASCADE: al renombrar un aroma, Postgres rechaza el UPDATE
-- porque product_aromas todavía apunta al nombre viejo.

alter table product_aromas drop constraint product_aromas_aroma_name_fkey;
alter table product_aromas
  add constraint product_aromas_aroma_name_fkey
  foreign key (aroma_name) references aromas(name)
  on update cascade on delete cascade;
