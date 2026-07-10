// History API routing: mapea pathname <-> vista, botón atrás/adelante,
// y todos los "ir a" (home, catálogo, admin, conocenos, contacto, producto),
// más el drawer de navegación mobile.
window.EC = window.EC || {};
EC.router = function (self) {
  return {
    parseRoute: (pathname) => {
      if (!pathname || pathname === '/') return { view: 'home' };
      if (pathname === '/catalogo') return { view: 'catalog' };
      if (pathname === '/checkout') return { view: 'checkout' };
      if (pathname === '/confirmacion') return { view: 'confirm' };
      if (pathname === '/admin') return { view: 'admin' };
      if (pathname === '/conocenos') return { view: 'about' };
      if (pathname === '/contacto') return { view: 'contact' };
      const m = pathname.match(/^\/producto\/([^/]+)\/?$/);
      if (m) return { view: 'product', productId: decodeURIComponent(m[1]) };
      return { view: 'home' };
    },
    navigate: (path, replace) => {
      try {
        if (replace) history.replaceState(null, '', path);
        else if (location.pathname !== path) history.pushState(null, '', path);
      } catch (e) { }
    },
    applyLocation: (pathname) => {
      if (pathname === '/carrito') { if (self._closeT) { clearTimeout(self._closeT); self._closeT = null; } self.setState({ cartMounted: true, cartOpen: true }); return; }
      if (self.state.cartOpen) { self.setState({ cartOpen: false }); if (self._closeT) clearTimeout(self._closeT); self._closeT = setTimeout(() => self.setState({ cartMounted: false }), 300); }
      const r = self.parseRoute(pathname);
      const resetAdmin = (self.state.view === 'admin' && r.view !== 'admin') ? { catGroupCollapsed: {}, expanded: {}, editingProductId: null, productDraft: null } : {};
      if (r.view === 'product') {
        const p = self.getProduct(r.productId);
        self.setState({ ...resetAdmin, view: 'product', productId: r.productId, detailColor: p ? (self.state.catalogColors[r.productId] || (p.colors[0] || null)) : null, detailScent: (p && self.isScented(p)) ? p.scents[0] : null, detailQty: 1, galleryIndex: 0, videoActivated: false });
      } else if (r.view === 'confirm') {
        if (self.state.order) self.setState({ ...resetAdmin, view: 'confirm' }); else self.navigate('/', true);
      } else if (r.view === 'checkout' && !self.state.cart.length) {
        self.navigate('/', true);
        self.setState({ ...resetAdmin, view: 'home' });
      } else {
        self.setState({ ...resetAdmin, view: r.view });
      }
    },

    goHome: () => { self.navigate('/'); self.setState({ view: 'home', catGroupCollapsed: {}, expanded: {}, editingProductId: null, productDraft: null }); self.scrollTop(); },
    goCatalog: () => { self.navigate('/catalogo'); self.setState({ view: 'catalog', filter: 'todos' }); self.scrollTop(); },
    goSearch: () => { self.goCatalog(); setTimeout(() => { const el = document.getElementById('ec-catalog-search'); if (el) el.focus(); }, 80); },
    openCatWith: (cat) => { self.navigate('/catalogo'); self.setState({ view: 'catalog', filter: cat }); self.scrollTop(); },
    setFilter: (cat) => { self.setState({ filter: cat }); },
    goAdmin: () => { self.navigate('/admin'); self.setState({ view: 'admin' }); self.scrollTop(); },
    goAdminTab: (tab) => {
      self.setState({ adminTab: tab, catGroupCollapsed: {}, expanded: {}, editingProductId: null, productDraft: null });
      if (tab === 'ventas') {
        self.loadSales().then(() => {
          const unseenIds = self.state.sales.filter(s => !s.seen && !s.cancelled).map(s => s.seq);
          if (unseenIds.length) {
            self.setState({ sales: self.state.sales.map(s => ({ ...s, seen: true })) });
            supabaseClient.from('sales').update({ seen: true }).in('id', unseenIds).then(({ error }) => { if (error) console.error('mark seen failed', error); });
          }
        });
      }
    },
    verProceso: () => { self.navigate('/conocenos'); self.setState({ view: 'about' }); self.scrollTop(); },
    verContacto: () => { self.navigate('/contacto'); self.setState({ view: 'contact' }); self.scrollTop(); },
    openProduct: (id) => { const p = self.getProduct(id); const fromCat = self.state.view === 'catalog'; self.navigate('/producto/' + encodeURIComponent(id)); self.setState({ view: 'product', productId: id, detailColor: p ? (self.state.catalogColors[id] || (p.colors[0] || null)) : null, detailScent: self.isScented(p) ? p.scents[0] : null, detailQty: 1, galleryIndex: 0, videoActivated: false, catalogScroll: fromCat ? (window.scrollY || 0) : self.state.catalogScroll, lastCatalogProductId: fromCat ? id : self.state.lastCatalogProductId }); self.scrollTop(); },
    backToCatalog: () => {
      const y = self.state.catalogScroll || 0;
      const pid = self.state.lastCatalogProductId;
      self.navigate('/catalogo');
      self.setState({ view: 'catalog' });
      setTimeout(() => {
        const el = pid ? document.getElementById('ec-catcard-' + pid) : null;
        const target = el ? (el.getBoundingClientRect().top + window.scrollY - 90) : y;
        self.forceScroll(() => target);
      }, 60);
    },

    // nav drawer
    openNav: () => { if (self._navT) clearTimeout(self._navT); self.setState({ navMounted: true, navOpen: true }); },
    closeNav: () => { self.setState({ navOpen: false }); if (self._navT) clearTimeout(self._navT); self._navT = setTimeout(() => self.setState({ navMounted: false }), 260); },
    navHome: () => { self.closeNav(); self.goHome(); },
    navCatalog: () => { self.closeNav(); self.goCatalog(); },
    navProceso: () => { self.closeNav(); self.verProceso(); },
    navContacto: () => { self.closeNav(); self.verContacto(); }
  };
};
