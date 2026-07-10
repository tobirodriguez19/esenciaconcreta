// Admin — destacados: sumar/quitar un producto del carrusel de inicio
// y reordenarlos.
window.EC = window.EC || {};
EC.admin = EC.admin || {};
EC.admin.featured = function (self) {
  return {
    toggleFeatured: async (id) => {
      const p = self.getProduct(id); const willFeature = !p.featured;
      let featuredPos = p.featuredPos;
      if (willFeature) { const maxPos = self.state.products.reduce((m, x) => x.featured ? Math.max(m, x.featuredPos || 0) : m, 0); featuredPos = maxPos + 1; }
      self.updateProduct(id, { featured: willFeature, featuredPos });
      const { error } = await supabaseClient.from('products').update({ featured: willFeature, featured_order: featuredPos }).eq('id', id);
      if (error) self.showToast('Error al guardar: ' + error.message);
    },
    moveFeatured: async (id, dir) => {
      const list = self.state.products.filter(p => p.featured).sort((a, b) => (a.featuredPos ?? 1e9) - (b.featuredPos ?? 1e9));
      const i = list.findIndex(p => p.id === id); if (i < 0) return;
      const j = i + dir; if (j < 0 || j >= list.length) return;
      const a = list[i], b = list[j];
      const posA = a.featuredPos ?? i, posB = b.featuredPos ?? j;
      const products = self.state.products.map(p => { if (p.id === a.id) return { ...p, featuredPos: posB }; if (p.id === b.id) return { ...p, featuredPos: posA }; return p; });
      self.setState({ products });
      const { error: e1 } = await supabaseClient.from('products').update({ featured_order: posB }).eq('id', a.id);
      const { error: e2 } = await supabaseClient.from('products').update({ featured_order: posA }).eq('id', b.id);
      if (e1 || e2) self.showToast('Error al guardar el orden');
    }
  };
};
