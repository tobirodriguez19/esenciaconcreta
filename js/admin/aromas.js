// Admin — catálogo global de aromas: alta, renombre (en cascada al stock),
// baja/reactivación.
window.EC = window.EC || {};
EC.admin = EC.admin || {};
EC.admin.aromas = function (self) {
  return {
    setNewAroma: e => self.setState({ newAroma: e.target.value }),
    addAroma: async () => {
      const name = (self.state.newAroma || '').trim(); if (!name) return;
      if (self.state.aromas.some(a => a.toLowerCase() === name.toLowerCase())) { self.showToast('Ese aroma ya existe'); return; }
      const { error } = await supabaseClient.from('aromas').insert({ name });
      if (error) { self.showToast('Error al crear aroma: ' + error.message); return; }
      self.setState({ aromas: [name, ...self.state.aromas], newAroma: '' });
      self.showToast(name + ' · aroma agregado');
    },
    startAromaEdit: (name) => { self.setState({ aromaEditName: name, aromaEdits: { ...self.state.aromaEdits, [name]: name } }); },
    cancelAromaEdit: (name) => { const edits = { ...self.state.aromaEdits }; delete edits[name]; self.setState({ aromaEditName: null, aromaEdits: edits }); },
    setAromaEdit: (name, v) => { self.setState({ aromaEdits: { ...self.state.aromaEdits, [name]: v } }); },
    saveAromaName: async (oldName) => {
      const v = (self.state.aromaEdits[oldName] != null ? self.state.aromaEdits[oldName] : oldName).trim();
      const edits = { ...self.state.aromaEdits }; delete edits[oldName];
      if (!v || v === oldName) { self.setState({ aromaEdits: edits, aromaEditName: null }); return; }
      if (self.state.aromas.some(a => a.toLowerCase() === v.toLowerCase())) { self.showToast('Ese aroma ya existe'); return; }
      const { error } = await supabaseClient.from('aromas').update({ name: v }).eq('name', oldName);
      if (error) { self.showToast('Error al renombrar: ' + error.message); return; }
      await supabaseClient.from('stock').update({ aroma_name: v }).eq('aroma_name', oldName);
      await self.loadCatalog();
      self.setState(s => ({ aromas: s.aromas.map(a => a === v ? v : a), aromaEdits: edits, aromaEditName: null }));
      self.showToast('Aroma actualizado');
    },
    deleteAroma: (name) => { self.askConfirm({ title: 'Desactivar aroma', message: '¿Desactivar "' + name + '"? Los productos que ya lo usan lo mantienen; podés reactivarlo después desde "Inactivos".', yesLabel: 'Desactivar', danger: true, onYes: async () => { const { error } = await supabaseClient.from('aromas').update({ active: false }).eq('name', name); if (error) { self.showToast('Error: ' + error.message); return; } self.setState({ aromas: self.state.aromas.filter(a => a !== name) }); await self.loadInactive(); self.showToast('Aroma desactivado'); } }); },
    reactivateAroma: async (name) => { const { error } = await supabaseClient.from('aromas').update({ active: true }).eq('name', name); if (error) { self.showToast('Error: ' + error.message); return; } await self.loadCatalog(); await self.loadInactive(); self.showToast('Aroma reactivado'); },
    toggleInactiveAromas: () => self.setState({ inactiveAromasOpen: !self.state.inactiveAromasOpen })
  };
};
