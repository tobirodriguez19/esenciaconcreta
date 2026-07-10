// Modal "Encargar este producto": se abre desde la ficha de producto cuando
// la combinación color+aroma elegida está sin stock pero el producto permite
// fabricación por encargo (ver canCustomOrder en js/core/renderVals.js).
// El alta es un insert público directo (RLS valida que el producto lo
// permita, ver supabase/017_custom_orders.sql) — no hace falta RPC porque,
// a diferencia de una venta, acá no se descuenta stock ni se calcula un total.
window.EC = window.EC || {};
EC.customOrders = function (self) {
  return {
    openCustomOrderModal: () => {
      const p = self.getProduct(self.state.productId); if (!p) return;
      self.setState({
        customOrderOpen: true,
        customOrderDraft: { productId: p.id, productName: p.name, color: self.state.detailColor || null, scent: self.isScented(p) ? self.state.detailScent : null, qty: 1, nombre: '', telefono: '', comentario: '' }
      });
    },
    closeCustomOrderModal: () => self.setState({ customOrderOpen: false, customOrderDraft: null }),
    setCustomOrderField: (key, v) => self.setState({ customOrderDraft: { ...self.state.customOrderDraft, [key]: v } }),
    incCoQty: () => { const d = self.state.customOrderDraft; self.setState({ customOrderDraft: { ...d, qty: d.qty + 1 } }); },
    decCoQty: () => { const d = self.state.customOrderDraft; self.setState({ customOrderDraft: { ...d, qty: Math.max(1, d.qty - 1) } }); },
    submitCustomOrder: async () => {
      const d = self.state.customOrderDraft;
      if (!d.nombre.trim() || !d.telefono.trim()) { self.showToast('Completá tu nombre y teléfono'); return; }
      // No hace falta leer de vuelta la fila insertada (y tampoco se podría: RLS
      // solo permite SELECT a admin) — para el email alcanza una referencia
      // armada del lado del cliente, no es un número de pedido real.
      const { error } = await supabaseClient.from('custom_orders').insert({
        product_id: d.productId, product_name: d.productName, color_name: d.color, aroma_name: d.scent, quantity: d.qty,
        customer_name: d.nombre.trim(), customer_phone: d.telefono.trim(), comment: d.comentario.trim() || null
      });
      if (error) { self.showToast('No se pudo enviar el pedido: ' + error.message); return; }
      self.notifySale({
        notice_type: 'Nuevo pedido por encargo',
        to_email: self.state.config.notifyEmails || '', order_id: 'ENC-' + Date.now().toString().slice(-6), customer_name: d.nombre.trim(), customer_phone: d.telefono.trim(), customer_email: '',
        delivery_method: 'Pedido por encargo', payment_method: '-',
        items: '- ' + d.productName + (d.color ? (' (' + d.color + (d.scent ? ' · ' + d.scent : '') + ')') : '') + ' x' + d.qty + (d.comentario.trim() ? ('\nComentario: ' + d.comentario.trim()) : ''),
        shipping: '-', total: '-'
      });
      self.closeCustomOrderModal();
      self.showToast('¡Pedido enviado! Te vamos a contactar para coordinar.');
    }
  };
};
