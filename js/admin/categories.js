// Admin — categorías: alta, orden, renombre inline y baja/reactivación.
window.EC = window.EC || {};
EC.admin = EC.admin || {};
EC.admin.categories = function (self) {
  return {
    toggleCatAdding: () => self.setState({ catAdding: !self.state.catAdding, newCat: { label: '' } }),
    setNCat: (patch) => { self.setState({ newCat: { ...self.state.newCat, ...patch } }); },
    addCategory: async () => {
      const label = (self.state.newCat.label || '').trim(); if (!label) { self.showToast('Poné un nombre'); return; }
      let id = self.slug(label); if (!id) id = 'cat-' + Date.now();
      if (self.state.categories.some(c => c.id === id)) id = id + '-' + Math.floor(Math.random() * 999);
      const sortOrder = self.state.categories.reduce((m, c) => Math.max(m, c.sortOrder || 0), 0) + 1;
      const { error } = await supabaseClient.from('categories').insert({ id, label, sort_order: sortOrder });
      if (error) { self.showToast('Error al crear categoría: ' + error.message); return; }
      self.setState({ categories: [...self.state.categories, { id, label, sortOrder }], catAdding: false, newCat: { label: '' } });
      self.showToast(label + ' · categoría creada');
    },
    moveCategory: async (id, dir) => {
      const list = self.state.categories.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const i = list.findIndex(c => c.id === id); if (i < 0) return;
      const j = i + dir; if (j < 0 || j >= list.length) return;
      const a = list[i], b = list[j]; const posA = a.sortOrder ?? i, posB = b.sortOrder ?? j;
      self.setState({ categories: self.state.categories.map(c => { if (c.id === a.id) return { ...c, sortOrder: posB }; if (c.id === b.id) return { ...c, sortOrder: posA }; return c; }) });
      await supabaseClient.from('categories').update({ sort_order: posB }).eq('id', a.id);
      await supabaseClient.from('categories').update({ sort_order: posA }).eq('id', b.id);
    },
    setCatLabel: (id, v) => { self.setState({ categories: self.state.categories.map(c => c.id === id ? { ...c, label: v } : c) }); self.debounce('catlabel:' + id, () => supabaseClient.from('categories').update({ label: v }).eq('id', id)); },
    deleteCategory: (id) => { const c = self.getCat(id); self.askConfirm({ title: 'Desactivar categoría', message: '¿Desactivar "' + (c ? c.label : '') + '"? Los productos que la usan la mantienen; podés reactivarla después desde "Inactivas".', yesLabel: 'Desactivar', danger: true, onYes: async () => { const { error } = await supabaseClient.from('categories').update({ active: false }).eq('id', id); if (error) { self.showToast('Error: ' + error.message); return; } self.setState({ categories: self.state.categories.filter(x => x.id !== id) }); await self.loadInactive(); self.showToast('Categoría desactivada'); } }); },
    reactivateCategory: async (id) => { const { error } = await supabaseClient.from('categories').update({ active: true }).eq('id', id); if (error) { self.showToast('Error: ' + error.message); return; } await self.loadCatalog(); await self.loadInactive(); self.showToast('Categoría reactivada'); },
    toggleInactiveCategories: () => self.setState({ inactiveCategoriesOpen: !self.state.inactiveCategoriesOpen })
  };
};
