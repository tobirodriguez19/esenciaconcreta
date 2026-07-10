// Admin — pestaña "Pedidos por encargo": listado, cambio de estado y notas
// internas de los pedidos creados desde js/customOrders.js (ficha de producto).
window.EC = window.EC || {};
EC.admin = EC.admin || {};
EC.admin.customOrders = function (self) {
  return {
    loadCustomOrders: async () => {
      const { data, error } = await supabaseClient.from('custom_orders').select('*').order('created_at', { ascending: false });
      if (error) { console.error('loadCustomOrders error', error); self.showToast('No se pudieron cargar los pedidos por encargo'); return; }
      self.setState({ customOrders: data });
    },
    setCustomOrderStatus: async (id, status) => {
      self.setState({ customOrders: self.state.customOrders.map(o => o.id === id ? { ...o, status } : o) });
      const { error } = await supabaseClient.from('custom_orders').update({ status }).eq('id', id);
      if (error) { self.showToast('Error al guardar: ' + error.message); return; }
      self.showToast('Pedido actualizado');
    },
    setCustomOrderNotes: (id, text) => {
      self.setState({ customOrders: self.state.customOrders.map(o => o.id === id ? { ...o, admin_notes: text } : o) });
      self.debounce('coNotes-' + id, async () => {
        const { error } = await supabaseClient.from('custom_orders').update({ admin_notes: text }).eq('id', id);
        if (error) self.showToast('Error al guardar la nota: ' + error.message);
      }, 600);
    }
  };
};
