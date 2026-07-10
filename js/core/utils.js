// Formato, helpers de stock/color y utilidades chicas compartidas por toda la app.
window.EC = window.EC || {};
EC.utils = function (self) {
  return {
    fmt: (n) => '$' + Number(n || 0).toLocaleString('es-AR'),
    stop: (e) => { if (e && e.stopPropagation) e.stopPropagation(); },
    hex: (name, p) => (p && p.colorHex && p.colorHex[name]) || self.HEX[name] || '#B6B1A8',
    slug: (s) => String(s).toLowerCase().normalize('NFD').split('').filter(ch => { const c = ch.codePointAt(0); return c < 768 || c > 879; }).join('').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    emptyNP: () => ({ name: '', category: '', price: '', stock: '', shortDesc: '', sku: '', colorsList: [], colorDraft: '', colorDraftHex: '#B6B1A8', aromasList: [], aromaDraft: '', photoName: '', stockMap: {}, stockTouched: false }),

    getProduct: (id) => self.state.products.find(x => x.id === id),
    getCat: (id) => self.state.categories.find(c => c.id === id),
    catLabel: (id) => { const c = self.getCat(id); return c ? c.label : id; },
    isScented: (p) => !!(p && p.scents && p.scents.length),
    colorKeys: (p) => (p && p.colors && p.colors.length) ? p.colors : [''],
    variantQty: (p, color, scent) => { const cs = p.cstock || {}; if (self.isScented(p)) { return (cs[color] && cs[color][scent]) || 0; } return cs[color] || 0; },
    colorStock: (p, color) => { const cs = p.cstock || {}; if (self.isScented(p)) { const m = cs[color] || {}; return p.scents.reduce((a, s) => a + (m[s] || 0), 0); } return cs[color] || 0; },
    totalStock: (p) => { if (!p) return 0; return self.colorKeys(p).reduce((a, c) => a + self.colorStock(p, c), 0); },
    stockFor: (id, color, scent) => { const p = self.getProduct(id); if (!p) return 0; if (color == null) { if (self.isScented(p)) { return self.colorKeys(p).reduce((a, c) => a + ((p.cstock[c] && p.cstock[c][scent]) || 0), 0); } return self.totalStock(p); } return self.variantQty(p, color, scent); },
    // Color/aroma por defecto al abrir un producto: preferir uno con stock en
    // vez de siempre el primero de la lista, para no aterrizar en "sin stock"
    // cuando hay otra variante disponible.
    firstStockedColor: (p) => { if (!p || !p.colors || !p.colors.length) return null; return p.colors.find(c => self.colorStock(p, c) > 0) || p.colors[0]; },
    firstStockedScent: (p, color) => { if (!p || !self.isScented(p)) return null; return p.scents.find(sc => self.stockFor(p.id, color, sc) > 0) || p.scents[0]; },

    showToast: (m) => { self.setState({ toast: m }); if (self._toastT) clearTimeout(self._toastT); self._toastT = setTimeout(() => self.setState({ toast: null }), 2800); },
    askConfirm: (o) => { self.setState({ confirm: o }); },
    confirmYes: () => { const c = self.state.confirm; self.setState({ confirm: null }); if (c && c.onYes) c.onYes(); },
    confirmNo: () => self.setState({ confirm: null }),
    debounce: (key, fn, ms = 600) => { clearTimeout(self._debounceT[key]); self._debounceT[key] = setTimeout(fn, ms); },

    chipStyle: (a) => { const b = 'cursor:pointer;border-radius:999px;padding:7px 14px;font-size:12.5px;letter-spacing:.01em;transition:all .2s;flex:0 0 auto;white-space:nowrap;'; return a ? b + 'background:#232220;color:#FAF9F6;border:1px solid #232220' : b + 'background:transparent;color:#56534c;border:1px solid rgba(35,34,32,.16)'; },
    scentChipStyle: (a) => { const b = 'cursor:pointer;border-radius:999px;padding:8px 16px;font-size:13px;letter-spacing:.01em;transition:all .2s;'; return a ? b + 'background:#232220;color:#FAF9F6;border:1px solid #232220' : b + 'background:transparent;color:#56534c;border:1px solid rgba(35,34,32,.16)'; },
    swatchStyle: (hex, sel) => 'width:38px;height:38px;border-radius:999px;cursor:pointer;background:' + hex + ';transition:box-shadow .2s;' + (sel ? 'box-shadow:inset 0 0 0 2px #FAF9F6,0 0 0 2px #232220;' : 'box-shadow:inset 0 0 0 1px rgba(35,34,32,.14);'),
    fulCardStyle: (a) => { const b = 'display:flex;align-items:center;gap:14px;cursor:pointer;border-radius:14px;padding:16px 18px;transition:all .2s;background:#fff;'; return b + (a ? 'border:1.5px solid #232220;' : 'border:1.5px solid rgba(35,34,32,.12);'); },
    pillBtn: (a) => { const b = 'cursor:pointer;border-radius:999px;padding:11px 22px;font-size:14px;transition:all .2s;'; return a ? b + 'background:transparent;color:#56534c;border:1px solid rgba(35,34,32,.18)' : b + 'background:#232220;color:#FAF9F6;border:1px solid #232220'; },
    tabStyle: (a) => { const b = 'cursor:pointer;border-radius:999px;padding:10px 18px;font-size:13.5px;letter-spacing:.01em;transition:all .2s;display:inline-flex;align-items:center;'; return a ? b + 'background:#232220;color:#FAF9F6;border:1px solid #232220' : b + 'background:#fff;color:#56534c;border:1px solid rgba(35,34,32,.14)'; }
  };
};
