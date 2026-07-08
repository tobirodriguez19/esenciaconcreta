// Carga del catálogo completo desde Supabase (productos, categorías, stock,
// fotos, aromas) y la selección de color activa en las tarjetas del catálogo.
window.EC = window.EC || {};
EC.catalog = function (self) {
  return {
    loadCatalog: async () => {
      try {
        const [catsQ, prodQ, colorsQ, aromasQ, prodAromasQ, stockQ, photosQ] = await Promise.all([
          supabaseClient.from('categories').select('id,label,photo_url,sort_order').eq('active', true).order('sort_order'),
          supabaseClient.from('products').select('id,category_id,sku,name,short_desc,long_desc,price,featured,featured_order,video_url').eq('active', true),
          supabaseClient.from('product_colors').select('product_id,color_name,hex_value,sort_order').order('sort_order'),
          supabaseClient.from('aromas').select('name').eq('active', true),
          supabaseClient.from('product_aromas').select('product_id,aroma_name,sort_order').order('sort_order'),
          supabaseClient.from('stock').select('product_id,color_name,aroma_name,quantity'),
          supabaseClient.from('product_photos').select('id,product_id,color_name,url,original_url,sort_order').order('sort_order')
        ]);
        const err = [catsQ, prodQ, colorsQ, aromasQ, prodAromasQ, stockQ, photosQ].map(r => r.error).find(Boolean);
        if (err) { console.error('Supabase loadCatalog error', err); self.showToast('No se pudo cargar el catálogo'); return; }
        const categories = catsQ.data.map(c => ({ id: c.id, label: c.label, photoUrl: c.photo_url || '', sortOrder: c.sort_order }));
        const colorsByProduct = {}; const colorHexByProduct = {}; colorsQ.data.forEach(r => { (colorsByProduct[r.product_id] = colorsByProduct[r.product_id] || []).push(r.color_name); if (r.hex_value) { (colorHexByProduct[r.product_id] = colorHexByProduct[r.product_id] || {})[r.color_name] = r.hex_value; } });
        const aromasByProduct = {}; prodAromasQ.data.forEach(r => { (aromasByProduct[r.product_id] = aromasByProduct[r.product_id] || []).push(r.aroma_name); });
        const stockByProduct = {}; stockQ.data.forEach(r => { (stockByProduct[r.product_id] = stockByProduct[r.product_id] || []).push(r); });
        const photosByProduct = {}; photosQ.data.forEach(r => { (photosByProduct[r.product_id] = photosByProduct[r.product_id] || []).push(r); });
        const products = prodQ.data.map(p => {
          const colors = colorsByProduct[p.id] || [];
          const scents = aromasByProduct[p.id] || [];
          const scented = scents.length > 0;
          const cstock = {}; colors.forEach(col => { cstock[col] = scented ? {} : 0; });
          (stockByProduct[p.id] || []).forEach(r => {
            if (!(r.color_name in cstock)) cstock[r.color_name] = scented ? {} : 0;
            if (scented && r.aroma_name) cstock[r.color_name][r.aroma_name] = r.quantity;
            else if (!scented) cstock[r.color_name] = r.quantity;
          });
          return { id: p.id, sku: p.sku, category: p.category_id, name: p.name, price: p.price, featured: p.featured, featuredPos: p.featured_order, shortDesc: p.short_desc, longDesc: p.long_desc, colors, scents, cstock, photoSlots: {}, photos: photosByProduct[p.id] || [], colorHex: colorHexByProduct[p.id] || {}, videoUrl: p.video_url || '' };
        });
        const aromas = aromasQ.data.map(a => a.name);
        self.setState({ categories, products, aromas });
      } catch (e) { console.error('Supabase loadCatalog exception', e); self.showToast('No se pudo conectar con la base de datos'); }
    },
    setCatColor: (id, color) => { self.setState({ catalogColors: { ...self.state.catalogColors, [id]: color } }); }
  };
};
