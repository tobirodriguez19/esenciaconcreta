// Admin — ventas: registrar venta presencial, listado/filtros, cancelar/
// deshacer, y editar los ítems de una venta ya registrada.
//
// Nota: addSaleItem (alta de venta nueva) valida stock disponible antes de
// agregar; addSaleEditItem (editar venta existente) no lo hace — es una
// diferencia de comportamiento real, no una duplicación accidental, así
// que se mantienen como dos funciones separadas en vez de forzarlas a
// compartir una sola implementación.
window.EC = window.EC || {};
EC.admin = EC.admin || {};
EC.admin.sales = function (self) {
  return {
    loadSales: async () => {
      const { data, error } = await supabaseClient.from('sales')
        .select('id,channel,total,payment_method,pay_status,delivery_status,cancelled,address,notes,seen,created_at,customers(name,last_name),sale_items(product_id,product_name,color_name,aroma_name,quantity,unit_price)')
        .order('created_at', { ascending: false });
      if (error) { console.error('loadSales error', error); self.showToast('No se pudieron cargar las ventas'); return; }
      const sales = data.map(row => ({
        seq: row.id, channel: row.channel,
        customer: (row.customers ? ((row.customers.name || '') + ' ' + (row.customers.last_name || '')).trim() : '') || 'Mostrador',
        items: (row.sale_items || []).map(it => ({ id: it.product_id, name: it.product_name || it.product_id, color: it.color_name, scent: it.aroma_name, qty: it.quantity, price: it.unit_price })),
        total: row.total, method: row.payment_method, payStatus: row.pay_status, delivery: row.delivery_status,
        cancelled: row.cancelled, date: new Date(row.created_at).toLocaleDateString('es-AR'),
        address: row.address || '', notes: row.notes || '', seen: row.seen
      }));
      self.setState({ sales });
    },

    // ---- venta presencial (popup "nueva venta") ----
    emptySaleDraft: () => ({ nombre: '', apellido: '', payStatus: 'pendiente', method: 'efectivo', delivery: 'pendiente', items: [] }),
    toggleSaleAdding: () => self.setState({ saleAdding: !self.state.saleAdding, salePick: { id: '', color: '', scent: '', qty: 1 }, saleDraft: self.emptySaleDraft() }),
    pickSaleProduct: (id) => { const p = self.getProduct(id); self.setState({ salePick: { id, color: p ? (p.colors[0] || '') : '', scent: p && self.isScented(p) ? p.scents[0] : '', qty: 1 } }); },
    clearSalePick: () => self.setState({ salePick: { id: '', color: '', scent: '', qty: 1 } }),
    onSalePickColor: e => self.setState({ salePick: { ...self.state.salePick, color: e.target.value } }),
    onSalePickColorVal: c => self.setState({ salePick: { ...self.state.salePick, color: c } }),
    onSalePickScent: e => self.setState({ salePick: { ...self.state.salePick, scent: e.target.value } }),
    onSalePickQty: e => { const n = parseInt(String(e.target.value).replace(/\D/g, ''), 10); self.setState({ salePick: { ...self.state.salePick, qty: Math.max(1, isNaN(n) ? 1 : n) } }); },
    incSalePickQty: () => { const sp = self.state.salePick; const p = self.getProduct(sp.id); const avail = self.stockFor(sp.id, sp.color, self.isScented(p) ? sp.scent : null); self.setState({ salePick: { ...sp, qty: Math.min(Math.max(1, avail), sp.qty + 1) } }); },
    decSalePickQty: () => { const sp = self.state.salePick; self.setState({ salePick: { ...sp, qty: Math.max(1, sp.qty - 1) } }); },
    addSaleItem: () => { const sp = self.state.salePick; if (!sp.id) { self.showToast('Elegí un producto'); return; } const p = self.getProduct(sp.id); const scent = self.isScented(p) ? sp.scent : null; const color = sp.color || (p.colors[0] || ''); const avail = self.stockFor(sp.id, color, scent); if (avail <= 0) { self.showToast('Sin stock de esa variante'); return; } const qty = Math.min(sp.qty, avail); const items = [...self.state.saleDraft.items, { id: sp.id, color, scent: scent || null, qty }]; self.setState({ saleDraft: { ...self.state.saleDraft, items }, salePick: { id: '', color: '', scent: '', qty: 1 } }); self.showToast(p.name + ' · agregado'); },
    removeSaleItem: (idx) => { self.setState({ saleDraft: { ...self.state.saleDraft, items: self.state.saleDraft.items.filter((_, i) => i !== idx) } }); },
    setSaleDraft: (patch) => { self.setState({ saleDraft: { ...self.state.saleDraft, ...patch } }); },
    registerSale: async () => {
      const d = self.state.saleDraft;
      if (!d.items.length) { self.showToast('Agregá al menos un producto'); return; }
      const items = d.items.map(it => ({ product_id: it.id, color_name: it.color, aroma_name: it.scent || null, quantity: it.qty, unit_price: self.getProduct(it.id).price }));
      const { data, error } = await supabaseClient.rpc('create_order', {
        p_customer: { name: d.nombre || 'Mostrador', last_name: d.apellido || '', email: null, phone: null, address: null },
        p_items: items, p_channel: 'presencial', p_payment_method: d.method,
        p_pay_status: d.payStatus, p_delivery_status: d.delivery, p_address: null, p_notes: null, p_seen: true
      });
      if (error) { self.showToast(/sin stock/i.test(error.message) ? error.message : 'Error al registrar la venta'); return; }
      const products = self.applyStock(self.state.products, d.items, -1);
      self.setState({ products, saleAdding: false, salePick: { id: '', color: '', scent: '', qty: 1 }, saleDraft: self.emptySaleDraft() });
      await self.loadSales();
      self.showToast('Venta registrada · stock actualizado');
    },

    // ---- listado: edición de campos, cancelar/deshacer, detalle ----
    setSaleField: async (seq, field, value) => {
      const col = field === 'pago' ? 'pay_status' : field === 'metodo' ? 'payment_method' : field === 'entrega' ? 'delivery_status' : null;
      if (!col) return;
      const localKey = field === 'pago' ? 'payStatus' : field === 'metodo' ? 'method' : 'delivery';
      self.setState({ sales: self.state.sales.map(s => s.seq === seq ? { ...s, [localKey]: value } : s) });
      const { error } = await supabaseClient.from('sales').update({ [col]: value }).eq('id', seq);
      if (error) { self.showToast('Error al guardar: ' + error.message); return; }
      self.showToast('Venta actualizada');
    },
    cancelSale: (seq) => {
      const s = self.state.sales.find(x => x.seq === seq); if (!s || s.cancelled) return;
      self.askConfirm({
        title: 'Cancelar venta', message: '¿Cancelar la venta ' + ('#' + String(seq).padStart(2, '0')) + '? Se repondrá el stock de los productos.', yesLabel: 'Cancelar venta', danger: true, onYes: async () => {
          const { error: e1 } = await supabaseClient.rpc('adjust_sale_stock', { p_sale_id: seq, p_sign: 1 });
          if (e1) { self.showToast('Error: ' + e1.message); return; }
          const { error: e2 } = await supabaseClient.from('sales').update({ cancelled: true }).eq('id', seq);
          if (e2) { self.showToast('Error: ' + e2.message); return; }
          const products = self.applyStock(self.state.products, s.items, 1);
          self.setState({ products, sales: self.state.sales.map(x => x.seq === seq ? { ...x, cancelled: true } : x) });
          self.showToast('Venta cancelada · stock repuesto');
        }
      });
    },
    undoCancel: async (seq) => {
      const s = self.state.sales.find(x => x.seq === seq); if (!s || !s.cancelled) return;
      const { error: e1 } = await supabaseClient.rpc('adjust_sale_stock', { p_sale_id: seq, p_sign: -1 });
      if (e1) { self.showToast('Error: ' + e1.message); return; }
      const { error: e2 } = await supabaseClient.from('sales').update({ cancelled: false }).eq('id', seq);
      if (e2) { self.showToast('Error: ' + e2.message); return; }
      const products = self.applyStock(self.state.products, s.items, -1);
      self.setState({ products, sales: self.state.sales.map(x => x.seq === seq ? { ...x, cancelled: false } : x) });
      self.showToast('Cancelación deshecha · stock descontado');
    },
    openSaleDetail: (seq) => { self.setState({ saleDetailSeq: seq }); },
    closeSaleDetail: () => self.setState({ saleDetailSeq: null }),

    // ---- editar ítems de una venta existente ----
    openSaleEdit: (seq) => { const s = self.state.sales.find(x => x.seq === seq); if (!s) return; self.setState({ saleEditSeq: seq, saleEditItems: s.items.map(i => ({ id: i.id, color: i.color, scent: i.scent || null, qty: i.qty })), salePick: { id: '', color: '', scent: '', qty: 1 } }); },
    closeSaleEdit: () => self.setState({ saleEditSeq: null, saleEditItems: [], salePick: { id: '', color: '', scent: '', qty: 1 } }),
    addSaleEditItem: () => { const sp = self.state.salePick; if (!sp.id) { self.showToast('Elegí un producto'); return; } const p = self.getProduct(sp.id); const scent = self.isScented(p) ? sp.scent : null; const color = sp.color || (p.colors[0] || ''); const items = [...self.state.saleEditItems, { id: sp.id, color, scent: scent || null, qty: sp.qty }]; self.setState({ saleEditItems: items, salePick: { id: '', color: '', scent: '', qty: 1 } }); self.showToast(p.name + ' · agregado'); },
    removeSaleEditItem: (idx) => { self.setState({ saleEditItems: self.state.saleEditItems.filter((_, i) => i !== idx) }); },
    setSaleEditQty: (idx, delta) => { self.setState({ saleEditItems: self.state.saleEditItems.map((it, i) => i === idx ? { ...it, qty: Math.max(1, it.qty + delta) } : it) }); },
    saveSaleEdit: async () => {
      const seq = self.state.saleEditSeq; const old = self.state.sales.find(x => x.seq === seq);
      if (!old) { self.closeSaleEdit(); return; }
      if (!self.state.saleEditItems.length) { self.showToast('La venta necesita al menos un producto'); return; }
      const items = self.state.saleEditItems.map(it => ({ product_id: it.id, color_name: it.color, aroma_name: it.scent || null, quantity: it.qty, unit_price: self.getProduct(it.id).price }));
      const { data, error } = await supabaseClient.rpc('edit_sale_items', { p_sale_id: seq, p_items: items });
      if (error) { self.showToast('Error al guardar: ' + error.message); return; }
      let products = self.state.products;
      if (!old.cancelled) { products = self.applyStock(products, old.items, 1); products = self.applyStock(products, self.state.saleEditItems, -1); }
      const displayItems = self.state.saleEditItems.map(it => { const p = self.getProduct(it.id); return { id: it.id, name: p.name, color: it.color, scent: it.scent || null, qty: it.qty, price: p.price }; });
      self.setState({ products, sales: self.state.sales.map(x => x.seq === seq ? { ...x, items: displayItems, total: data.total } : x) });
      self.showToast('Venta actualizada · stock ajustado');
      self.closeSaleEdit();
    },

    // ---- filtros del listado ----
    onVSearch: e => self.setState({ vSearch: e.target.value }),
    onVPay: e => self.setState({ vPay: e.target.value }),
    onVDel: e => self.setState({ vDel: e.target.value }),
    onVType: e => self.setState({ vType: e.target.value }),
    onVSort: e => self.setState({ vSort: e.target.value })
  };
};
