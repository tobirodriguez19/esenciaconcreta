// Admin — "El Oficio" (sección de inicio/Conocenos): contenido real en
// Supabase (site_content), editado con borrador local (Guardar/Cancelar).
window.EC = window.EC || {};
EC.admin = EC.admin || {};
EC.admin.siteContent = function (self) {
  return {
    loadSiteContent: async () => {
      const { data, error } = await supabaseClient.from('site_content').select('*').eq('id', 1).single();
      if (error) { console.error('loadSiteContent error', error); return; }
      self.setState({ oficio: { eyebrow: data.oficio_eyebrow, title: data.oficio_title, body: data.oficio_body, steps: data.oficio_steps || [] }, oficioPhotoUrl: data.oficio_photo_url || '' });
    },
    startEditOficio: () => self.setState({ oficioEditing: true, oficioDraft: JSON.parse(JSON.stringify(self.state.oficio)) }),
    cancelEditOficio: () => self.setState({ oficioEditing: false, oficioDraft: null }),
    setOficioDraftField: (key, v) => { self.setState({ oficioDraft: { ...self.state.oficioDraft, [key]: v } }); },
    setOficioDraftStep: (i, field, v) => { const steps = self.state.oficioDraft.steps.map((st, idx) => idx === i ? { ...st, [field]: v } : st); self.setState({ oficioDraft: { ...self.state.oficioDraft, steps } }); },
    saveOficioDraft: async () => {
      const d = self.state.oficioDraft;
      const { error } = await supabaseClient.from('site_content').update({ oficio_eyebrow: d.eyebrow, oficio_title: d.title, oficio_body: d.body, oficio_steps: d.steps }).eq('id', 1);
      if (error) { self.showToast('Error al guardar: ' + error.message); return; }
      self.setState({ oficio: d, oficioEditing: false, oficioDraft: null });
      self.showToast('Cambios guardados');
    }
  };
};
