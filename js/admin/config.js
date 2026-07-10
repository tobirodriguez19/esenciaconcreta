// Admin — config del sitio (envío + datos de transferencia): antes vivía
// hardcodeada en el estado inicial del frontend (se "guardaba" pero nunca
// se persistía). Ahora se lee/guarda en la tabla site_config de Supabase
// (lectura pública porque el checkout necesita mostrarla, escritura
// solo admin vía RLS) — ver supabase/013_site_config.sql.
//
// Se edita con el mismo patrón de borrador (Editar/Guardar/Cancelar) que
// el resto del admin, en vez de guardar en cada tecla — así no queda
// editable "a primera vista" apenas se entra a la pestaña de Ventas.
window.EC = window.EC || {};
EC.admin = EC.admin || {};
EC.admin.config = function (self) {
  return {
    loadConfig: async () => {
      const { data, error } = await supabaseClient.from('site_config').select('*').eq('id', 1).single();
      if (error) { console.error('loadConfig error', error); return; }
      self.setState({ config: { shipping: data.shipping, alias: data.alias, cbu: data.cbu, titular: data.titular, whatsapp: data.whatsapp } });
    },
    startEditCfg: () => self.setState({ cfgEditing: true, cfgDraft: { ...self.state.config } }),
    cancelEditCfg: () => self.setState({ cfgEditing: false, cfgDraft: null }),
    setCfgDraftField: (key, v) => self.setState({ cfgDraft: { ...self.state.cfgDraft, [key]: v } }),
    saveCfgDraft: async () => {
      const d = self.state.cfgDraft;
      const n = parseInt(String(d.shipping).replace(/\D/g, ''), 10);
      const config = { shipping: isNaN(n) ? 0 : n, alias: d.alias || '', cbu: d.cbu || '', titular: d.titular || '', whatsapp: d.whatsapp || '' };
      const { error } = await supabaseClient.from('site_config').update(config).eq('id', 1);
      if (error) { self.showToast('Error al guardar: ' + error.message); return; }
      self.setState({ config, cfgEditing: false, cfgDraft: null });
      self.showToast('Cambios guardados');
    }
  };
};
