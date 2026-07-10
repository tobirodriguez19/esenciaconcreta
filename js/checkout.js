// Formulario de checkout, armado de líneas del pedido y confirmación
// (RPC create_order) — el pago/stock se valida y descuenta server-side.
window.EC = window.EC || {};
EC.checkout = function (self) {
  return {
    onNombre: e => self.setState({ form: { ...self.state.form, nombre: e.target.value } }),
    onApellido: e => self.setState({ form: { ...self.state.form, apellido: e.target.value } }),
    onTelefono: e => self.setState({ form: { ...self.state.form, telefono: e.target.value } }),
    onEmail: e => self.setState({ form: { ...self.state.form, email: e.target.value } }),
    onDireccion: e => self.setState({ form: { ...self.state.form, direccion: e.target.value } }),
    selRetiro: () => self.setState({ fulfillment: 'retiro' }),
    selEnvio: () => self.setState({ fulfillment: 'envio' }),
    selTransfer: () => self.setState({ payment: 'transferencia' }),
    selEfectivo: () => self.setState({ payment: 'efectivo' }),
    buildLines: () => self.state.cart.map(it => {
      const p = self.getProduct(it.id); const total = p.price * it.qty;
      return { key: it.key, id: it.id, color: it.color, scent: it.scent || null, name: p.name, qty: it.qty, total, priceFmt: self.fmt(p.price), lineFmt: self.fmt(total), slotId: 'ec-prod-' + p.id, img: self.photoUrlFor(p), meta: it.scent ? (it.color + ' · ' + it.scent) : (it.color ? ('Color · ' + it.color) : ''), inc: () => self.incLine(it.key), dec: () => self.decLine(it.key), remove: () => self.removeLine(it.key) };
    }),
    placeOrder: async () => {
      const f = self.state.form;
      if (!f.nombre || !f.email) { self.showToast('Completá tu nombre y email'); return; }
      if (self.state.fulfillment === 'envio' && !f.direccion) { self.showToast('Ingresá tu dirección de envío'); return; }
      const lines = self.buildLines();
      const subtotal = lines.reduce((a, l) => a + l.total, 0);
      const shipping = self.state.fulfillment === 'envio' ? (self.state.config.shipping || 0) : 0;
      const total = subtotal + shipping;
      const address = self.state.fulfillment === 'envio' ? f.direccion : '';
      const items = self.state.cart.map(it => ({ product_id: it.id, color_name: it.color || '', aroma_name: it.scent || null, quantity: it.qty, unit_price: self.getProduct(it.id).price }));
      const { data, error } = await supabaseClient.rpc('create_order', {
        p_customer: { name: f.nombre, last_name: f.apellido, email: f.email, phone: f.telefono, address },
        p_items: items, p_channel: 'online', p_payment_method: self.state.payment,
        p_pay_status: 'pendiente', p_delivery_status: 'pendiente', p_address: address, p_notes: '', p_seen: false
      });
      if (error) { self.showToast(/sin stock/i.test(error.message) ? error.message : 'No se pudo procesar el pedido'); return; }
      if (shipping > 0) await supabaseClient.from('sales').update({ total }).eq('id', data.sale_id);
      const isTransfer = self.state.payment === 'transferencia';
      const order = { code: '#' + String(data.sale_id).padStart(2, '0'), name: f.nombre, totalFmt: self.fmt(total), isTransfer, isEfectivo: !isTransfer, deliveryWord: self.state.fulfillment === 'envio' ? 'el envío' : 'el retiro', items: lines.map(l => ({ name: l.name, meta: l.meta, qty: l.qty, lineFmt: self.fmt(l.total) })) };
      const products = self.applyStock(self.state.products, self.state.cart, -1);
      self.navigate('/confirmacion', true);
      self.setState({ products, order, view: 'confirm', cart: [] });
      self.scrollTop();
    },
    sendReceipt: () => { const num = String((self.state.config && self.state.config.whatsapp) || '').replace(/\D/g, ''); const url = 'https://wa.me/' + num; try { window.open(url, '_blank', 'noopener'); } catch (e) { window.location.href = url; } },
    backToShop: () => { self.navigate('/'); self.setState({ order: null, view: 'home' }); self.scrollTop(); }
  };
};
