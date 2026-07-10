// Admin — config del sitio (envío + datos de transferencia): antes vivía
// hardcodeada en el estado inicial del frontend (se "guardaba" pero nunca
// se persistía). Ahora se lee/guarda en la tabla site_config de Supabase
// (lectura pública porque el checkout necesita mostrarla, escritura
// solo admin vía RLS) — ver supabase/013_site_config.sql.
window.EC = window.EC || {};
EC.admin = EC.admin || {};
EC.admin.config = function (self) {
  return {
    loadConfig: async () => {
      const { data, error } = await supabaseClient.from('site_config').select('*').eq('id', 1).single();
      if (error) { console.error('loadConfig error', error); return; }
      self.setState({ config: { shipping: data.shipping, alias: data.alias, cbu: data.cbu, titular: data.titular, whatsapp: data.whatsapp } });
    },
    setCfg: (patch) => {
      const config = { ...self.state.config, ...patch };
      self.setState({ config });
      // Debounce por una sola clave compartida: siempre manda el config
      // completo ya mezclado, así una tanda rápida de ediciones en varios
      // campos no pierde ninguna (la última corrida igual incluye todo).
      self.debounce('siteConfig', () => {
        supabaseClient.from('site_config').update({
          shipping: config.shipping, alias: config.alias, cbu: config.cbu, titular: config.titular, whatsapp: config.whatsapp
        }).eq('id', 1).then(({ error }) => { if (error) self.showToast('Error al guardar: ' + error.message); });
      });
    },
    onCfgShipping: e => { const n = parseInt(String(e.target.value).replace(/\D/g, ''), 10); self.setCfg({ shipping: isNaN(n) ? 0 : n }); },
    onCfgTitular: e => self.setCfg({ titular: e.target.value }),
    onCfgAlias: e => self.setCfg({ alias: e.target.value }),
    onCfgCbu: e => self.setCfg({ cbu: e.target.value }),
    onCfgWhatsapp: e => self.setCfg({ whatsapp: e.target.value })
  };
};
