// Admin — stock: escritura remota compartida por productos y ventas
// (movimientos, upsert), y carga de los ítems inactivos (papelera).
window.EC = window.EC || {};
EC.admin = EC.admin || {};
EC.admin.stock = function (self) {
  return {
    recordStockMovement: async (productId, color, scent, type, delta, reason) => {
      try { await supabaseClient.from('stock_movements').insert({ product_id: productId, color_name: color, aroma_name: scent || null, movement_type: type, quantity: delta, reason: reason || null, performed_by: self.state.authUser ? self.state.authUser.id : null }); }
      catch (e) { console.error('stock_movements insert failed', e); }
    },
    upsertStockRemote: async (productId, color, scent, quantity) => {
      let q = supabaseClient.from('stock').select('id').eq('product_id', productId).eq('color_name', color);
      q = scent ? q.eq('aroma_name', scent) : q.is('aroma_name', null);
      const { data, error: selErr } = await q;
      if (selErr) { console.error(selErr); return false; }
      if (data && data.length) { const { error } = await supabaseClient.from('stock').update({ quantity }).eq('id', data[0].id); if (error) { console.error(error); return false; } }
      else { const { error } = await supabaseClient.from('stock').insert({ product_id: productId, color_name: color, aroma_name: scent || null, quantity }); if (error) { console.error(error); return false; } }
      return true;
    },
    loadInactive: async () => {
      const [pQ, cQ, aQ] = await Promise.all([
        supabaseClient.from('products').select('id,sku,name,category_id').eq('active', false),
        supabaseClient.from('categories').select('id,label').eq('active', false),
        supabaseClient.from('aromas').select('name').eq('active', false)
      ]);
      self.setState({
        inactiveProducts: pQ.error ? [] : pQ.data,
        inactiveCategories: cQ.error ? [] : cQ.data,
        inactiveAromas: aQ.error ? [] : aQ.data.map(a => a.name)
      });
    }
  };
};
