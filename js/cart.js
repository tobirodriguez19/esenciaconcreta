// Carrito: agregar/quitar líneas, cantidad en la ficha de producto, drawer.
window.EC = window.EC || {};
EC.cart = function (self) {
  return {
    cartCount: () => self.state.cart.reduce((a, b) => a + b.qty, 0),
    addToCart: (id, color, scent, qty) => {
      const p = self.getProduct(id); const avail = self.stockFor(id, color, scent);
      if (avail <= 0) { self.showToast('Sin stock disponible'); return; }
      const key = id + '|' + color + '|' + (scent || '');
      const cart = self.state.cart.slice(); const ex = cart.find(c => c.key === key);
      if (ex) { ex.qty = Math.min(avail, ex.qty + qty); } else { cart.push({ key, id, color, scent: scent || null, qty: Math.min(avail, qty) }); }
      self.setState({ cart, cartBump: self.state.cartBump + 1 });
    },
    quickAdd: (id) => { const p = self.getProduct(id); const color = self.state.catalogColors[id] || (p.colors && p.colors.length ? p.colors[0] : null); self.addToCart(id, color, self.isScented(p) ? p.scents[0] : null, 1); },
    setDetailColor: (n) => { self.pauseVideos(); self.setState({ detailColor: n, galleryIndex: 0, videoActivated: false }); },
    setDetailScent: (n) => { self.setState({ detailScent: n, detailQty: 1 }); },
    incDetail: () => {
      const p = self.getProduct(self.state.productId);
      const max = self.stockFor(self.state.productId, self.state.detailColor, self.state.detailScent) || 0;
      const next = self.state.detailQty + 1;
      if (next > max) {
        if (p && p.allowCustomOrder) {
          const falta = next - max;
          self.askConfirm({
            title: 'Stock limitado',
            message: 'Por ahora tenemos ' + max + ' unidad' + (max === 1 ? '' : 'es') + ' disponible' + (max === 1 ? '' : 's') + '. ¿Querés encargar ' + falta + ' unidad' + (falta === 1 ? '' : 'es') + ' más por fabricación a pedido' + (p.customOrderEta ? (' (tiempo estimado: ' + p.customOrderEta + ')') : '') + '?',
            yesLabel: 'Encargar el resto',
            onYes: () => self.openCustomOrderModalForShortfall(falta)
          });
        } else {
          self.showToast('No hay más stock disponible');
        }
        return;
      }
      self.setState({ detailQty: next });
    },
    decDetail: () => { self.setState({ detailQty: Math.max(1, self.state.detailQty - 1) }); },
    addDetail: () => {
      const p = self.getProduct(self.state.productId); if (!p) return;
      const color = self.state.detailColor || p.colors[0];
      const scent = self.isScented(p) ? (self.state.detailScent || p.scents[0]) : null;
      if (self.stockFor(p.id, color, scent) <= 0) { self.showToast('Sin stock disponible'); return; }
      self.addToCart(p.id, color, scent, self.state.detailQty); self.openCart();
    },
    incLine: (key) => { const cart = self.state.cart.slice(); const it = cart.find(c => c.key === key); it.qty = Math.min(self.stockFor(it.id, it.color, it.scent), it.qty + 1); self.setState({ cart }); },
    decLine: (key) => { let cart = self.state.cart.slice(); const it = cart.find(c => c.key === key); it.qty -= 1; if (it.qty <= 0) cart = cart.filter(c => c.key !== key); self.setState({ cart }); },
    removeLine: (key) => { self.setState({ cart: self.state.cart.filter(c => c.key !== key) }); },
    openCart: () => { if (self._closeT) clearTimeout(self._closeT); self.navigate('/carrito'); self.setState({ cartMounted: true, cartOpen: true }); },
    closeCart: (skipHistory) => {
      self.setState({ cartOpen: false });
      if (self._closeT) clearTimeout(self._closeT);
      self._closeT = setTimeout(() => self.setState({ cartMounted: false }), 300);
      if (!skipHistory && location.pathname === '/carrito') { try { history.back(); } catch (e) { } }
    },
    goCatalogFromCart: () => { self.closeCart(true); self.goCatalog(); },
    goCheckout: () => { if (!self.state.cart.length) { self.showToast('Tu carrito está vacío'); return; } self.closeCart(true); self.navigate('/checkout'); self.setState({ view: 'checkout' }); self.scrollTop(); }
  };
};
