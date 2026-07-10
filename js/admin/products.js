// Admin — productos: edición con borrador local (Guardar/Cancelar,
// nada se escribe en Supabase hasta saveProductDraft) y alta/baja.
window.EC = window.EC || {};
EC.admin = EC.admin || {};
EC.admin.products = function (self) {
  return {
    // ---- edición con borrador ----
    toggleExpand: (id) => { if (self.state.expanded[id]) self.cancelEditProduct(id); else self.startEditProduct(id); },
    buildDraft: (p) => ({
      name: p.name, shortDesc: p.shortDesc || '', longDesc: p.longDesc || '', price: p.price, sku: p.sku || '', category: p.category,
      colors: (p.colors || []).map(name => ({ orig: name, name, hex: (p.colorHex && p.colorHex[name]) || '' })),
      scents: (p.scents || []).slice(),
      cstock: JSON.parse(JSON.stringify(p.cstock || {}))
    }),
    startEditProduct: (id) => {
      const p = self.getProduct(id); if (!p) return;
      self.setState({ expanded: { ...self.state.expanded, [id]: true }, editingProductId: id, productDraft: self.buildDraft(p), draftColorInput: '', draftColorHex: '#B6B1A8' });
    },
    cancelEditProduct: (id) => { self.setState({ editingProductId: null, productDraft: null, expanded: { ...self.state.expanded, [id]: false } }); },
    setDraftField: (key, v) => { self.setState({ productDraft: { ...self.state.productDraft, [key]: v } }); },
    onDraftColorInput: e => self.setState({ draftColorInput: e.target.value }),
    onDraftColorHex: e => self.setState({ draftColorHex: e.target.value }),
    addDraftColor: () => {
      const name = (self.state.draftColorInput || '').trim(); if (!name) return;
      const d = self.state.productDraft;
      if (d.colors.some(c => c.name.toLowerCase() === name.toLowerCase())) { self.showToast('Ese color ya existe'); return; }
      const colors = [...d.colors, { orig: null, name, hex: self.state.draftColorHex }];
      const cstock = { ...d.cstock }; cstock[name] = d.scents.length ? d.scents.reduce((o, sc) => { o[sc] = 0; return o; }, {}) : 0;
      self.setState({ productDraft: { ...d, colors, cstock }, draftColorInput: '', draftColorHex: '#B6B1A8' });
    },
    renameDraftColor: (idx, name) => {
      const d = self.state.productDraft; if (!name || !name.trim()) return; const old = d.colors[idx].name;
      const colors = d.colors.map((c, i) => i === idx ? { ...c, name } : c);
      const cstock = { ...d.cstock }; if (old in cstock) { cstock[name] = cstock[old]; if (name !== old) delete cstock[old]; }
      self.setState({ productDraft: { ...d, colors, cstock } });
    },
    setDraftColorHex: (idx, hex) => { const d = self.state.productDraft; const colors = d.colors.map((c, i) => i === idx ? { ...c, hex } : c); self.setState({ productDraft: { ...d, colors } }); },
    removeDraftColor: (idx) => {
      const d = self.state.productDraft;
      const name = d.colors[idx].name; const colors = d.colors.filter((_, i) => i !== idx);
      const cstock = { ...d.cstock }; delete cstock[name];
      if (!colors.length) { cstock[''] = d.scents.length ? d.scents.reduce((o, sc) => { o[sc] = 0; return o; }, {}) : 0; }
      self.setState({ productDraft: { ...d, colors, cstock } });
    },
    draftAdjustVariant: (color, scent, delta) => {
      const d = self.state.productDraft; const cstock = JSON.parse(JSON.stringify(d.cstock)); const scented = d.scents.length > 0;
      if (scented) { if (!cstock[color] || typeof cstock[color] !== 'object') cstock[color] = {}; cstock[color][scent] = Math.max(0, (cstock[color][scent] || 0) + delta); }
      else { cstock[color] = Math.max(0, (typeof cstock[color] === 'number' ? cstock[color] : 0) + delta); }
      self.setState({ productDraft: { ...d, cstock } });
    },
    draftSetVariant: (color, scent, v) => {
      const n = Math.max(0, parseInt(String(v).replace(/\D/g, ''), 10) || 0);
      const d = self.state.productDraft; const cstock = JSON.parse(JSON.stringify(d.cstock)); const scented = d.scents.length > 0;
      if (scented) { if (!cstock[color] || typeof cstock[color] !== 'object') cstock[color] = {}; cstock[color][scent] = n; } else { cstock[color] = n; }
      self.setState({ productDraft: { ...d, cstock } });
    },
    draftAssignAroma: (name) => {
      const d = self.state.productDraft; if (d.scents.indexOf(name) >= 0) return;
      const scents = [...d.scents, name]; const cstock = JSON.parse(JSON.stringify(d.cstock));
      const keys = d.colors.length ? d.colors.map(c => c.name) : [''];
      keys.forEach(k => { if (!cstock[k] || typeof cstock[k] !== 'object') cstock[k] = {}; if (!(name in cstock[k])) cstock[k][name] = 0; });
      self.setState({ productDraft: { ...d, scents, cstock } });
    },
    draftRemoveAroma: (name) => {
      const d = self.state.productDraft; const scents = d.scents.filter(s => s !== name); const cstock = JSON.parse(JSON.stringify(d.cstock));
      const keys = d.colors.length ? d.colors.map(c => c.name) : [''];
      keys.forEach(k => { if (cstock[k] && typeof cstock[k] === 'object') delete cstock[k][name]; });
      self.setState({ productDraft: { ...d, scents, cstock } });
    },
    createAndAssignAroma: async () => {
      const name = (self.state.aromaSearch || '').trim(); if (!name) return;
      if (self.state.aromas.some(a => a.toLowerCase() === name.toLowerCase())) { self.draftAssignAroma(name); self.setState({ aromaSearch: '' }); return; }
      const { error } = await supabaseClient.from('aromas').insert({ name });
      if (error) { self.showToast('Error al crear aroma: ' + error.message); return; }
      self.setState({ aromas: [name, ...self.state.aromas], aromaSearch: '' });
      self.draftAssignAroma(name);
    },
    saveProductDraft: async () => {
      const id = self.state.editingProductId; const d = self.state.productDraft; const orig = self.getProduct(id);
      if (!id || !d || !orig) return;
      if (!d.name.trim()) { self.showToast('Poné un nombre'); return; }
      try {
        const price = parseInt(String(d.price).replace(/\D/g, ''), 10) || 0;
        const { error: pErr } = await supabaseClient.from('products').update({ name: d.name.trim(), short_desc: d.shortDesc, long_desc: d.longDesc, price, sku: d.sku || null, category_id: d.category }).eq('id', id);
        if (pErr) throw pErr;

        // product_colors solo guarda colores con nombre real — un producto sin color no tiene filas ahí.
        const origColors = orig.colors || [];
        for (const oc of origColors) {
          if (!d.colors.some(c => c.orig === oc)) {
            await supabaseClient.from('product_colors').delete().eq('product_id', id).eq('color_name', oc);
            await supabaseClient.from('stock').delete().eq('product_id', id).eq('color_name', oc);
          }
        }
        for (let i = 0; i < d.colors.length; i++) {
          const c = d.colors[i];
          if (c.orig === null) {
            await supabaseClient.from('product_colors').insert({ product_id: id, color_name: c.name, hex_value: c.hex || null, sort_order: i });
          } else {
            const patch = { sort_order: i, hex_value: c.hex || null };
            if (c.orig !== c.name) patch.color_name = c.name;
            await supabaseClient.from('product_colors').update(patch).eq('product_id', id).eq('color_name', c.orig);
            if (c.orig !== c.name) await supabaseClient.from('stock').update({ color_name: c.name }).eq('product_id', id).eq('color_name', c.orig);
          }
        }

        // aromas del catálogo global asignados/quitados a este producto
        const origScents = orig.scents || [];
        for (const os of origScents) {
          if (d.scents.indexOf(os) < 0) {
            await supabaseClient.from('product_aromas').delete().eq('product_id', id).eq('aroma_name', os);
            await supabaseClient.from('stock').delete().eq('product_id', id).eq('aroma_name', os);
          }
        }
        for (const sc of d.scents) {
          if (origScents.indexOf(sc) < 0) {
            await supabaseClient.from('product_aromas').insert({ product_id: id, aroma_name: sc, sort_order: d.scents.indexOf(sc) });
          }
        }

        // Stock: se normaliza a "al menos un color" usando '' como bucket general cuando el
        // producto no tiene colores (evita casos especiales duplicados de inserción).
        const draftColors = d.colors.length ? d.colors : [{ orig: origColors.length ? null : '', name: '', hex: '' }];
        const scentedDraft = d.scents.length > 0;
        for (const c of draftColors) {
          const key = c.name;
          if (scentedDraft) {
            for (const sc of d.scents) {
              const draftQty = (d.cstock[key] && d.cstock[key][sc]) || 0;
              const origHasCombo = c.orig !== null && orig.cstock && orig.cstock[c.orig] && typeof orig.cstock[c.orig] === 'object' && origScents.indexOf(sc) >= 0;
              if (!origHasCombo) {
                await supabaseClient.from('stock').insert({ product_id: id, color_name: key, aroma_name: sc, quantity: draftQty });
                if (draftQty > 0) await self.recordStockMovement(id, key, sc, 'entrada', draftQty, 'Alta de variante');
                continue;
              }
              const origQty = orig.cstock[c.orig][sc] || 0;
              if (draftQty !== origQty) { await self.upsertStockRemote(id, key, sc, draftQty); await self.recordStockMovement(id, key, sc, 'ajuste', draftQty - origQty, 'Edición de producto'); }
            }
          } else {
            const draftQty = typeof d.cstock[key] === 'number' ? d.cstock[key] : 0;
            const origHasColor = c.orig !== null && typeof orig.cstock[c.orig] === 'number';
            if (!origHasColor) {
              await supabaseClient.from('stock').insert({ product_id: id, color_name: key, aroma_name: null, quantity: draftQty });
              if (draftQty > 0) await self.recordStockMovement(id, key, null, 'entrada', draftQty, 'Alta de variante');
              continue;
            }
            const origQty = typeof orig.cstock[c.orig] === 'number' ? orig.cstock[c.orig] : 0;
            if (draftQty !== origQty) { await self.upsertStockRemote(id, key, null, draftQty); await self.recordStockMovement(id, key, null, 'ajuste', draftQty - origQty, 'Edición de producto'); }
          }
        }

        self.setState({ editingProductId: null, productDraft: null, expanded: { ...self.state.expanded, [id]: false } });
        await self.loadCatalog();
        self.showToast('Cambios guardados');
      } catch (e) { console.error('saveProductDraft failed', e); self.showToast('Error al guardar: ' + (e && e.message ? e.message : '')); }
    },

    // ---- alta y borrado ----
    setNP: (patch) => { self.setState({ newProduct: { ...self.state.newProduct, ...patch } }); },
    toggleProdAdding: () => self.setState({ prodAdding: !self.state.prodAdding, newProduct: self.emptyNP(), newProductPhoto: null }),
    addNPColor: () => { const np = self.state.newProduct; const name = (np.colorDraft || '').trim(); if (!name) return; if (np.colorsList.some(c => c.name.toLowerCase() === name.toLowerCase())) { self.showToast('Ese color ya existe'); return; } self.setNP({ colorsList: [...np.colorsList, { name, hex: np.colorDraftHex }], colorDraft: '', colorDraftHex: '#B6B1A8', stockMap: {}, stockTouched: false }); },
    removeNPColor: (idx) => { const np = self.state.newProduct; self.setNP({ colorsList: np.colorsList.filter((_, i) => i !== idx), stockMap: {}, stockTouched: false }); },
    addNPAroma: (name) => { const np = self.state.newProduct; const v = (name || np.aromaDraft || '').trim(); if (!v) return; if (np.aromasList.some(a => a.toLowerCase() === v.toLowerCase())) { self.showToast('Ese aroma ya está agregado'); return; } self.setNP({ aromasList: [...np.aromasList, v], aromaDraft: '', stockMap: {}, stockTouched: false }); },
    removeNPAroma: (idx) => { const np = self.state.newProduct; self.setNP({ aromasList: np.aromasList.filter((_, i) => i !== idx), stockMap: {}, stockTouched: false }); },
    onNPPhoto: e => { const f = e.target.files && e.target.files[0]; self.setState({ newProductPhoto: f || null }); self.setNP({ photoName: f ? f.name : '' }); },
    npComboList: (np) => {
      const colors = np.colorsList || []; const aromas = np.aromasList || [];
      const colorKeys = colors.length ? colors.map(c => c.name) : [''];
      return aromas.length ? colorKeys.flatMap(ck => aromas.map(a => ({ color: ck, aroma: a }))) : colorKeys.map(ck => ({ color: ck, aroma: null }));
    },
    setNPStockCombo: (key, v) => { const np = self.state.newProduct; self.setNP({ stockMap: { ...np.stockMap, [key]: v }, stockTouched: true }); },
    addProduct: async () => {
      const np = self.state.newProduct; const name = (np.name || '').trim();
      if (!name) { self.showToast('Poné un nombre'); return; }
      if (!np.category) { self.showToast('Elegí una categoría'); return; }
      const price = parseInt(String(np.price).replace(/\D/g, ''), 10) || 0;
      const colors = np.colorsList || []; const aromas = np.aromasList || [];
      const comboList = self.npComboList(np);
      if (comboList.length > 1 && !np.stockTouched) { self.showToast('Repartí el stock entre las variantes antes de crear el producto'); return; }
      let id = self.slug(name); if (!id) id = 'prod-' + Date.now();
      if (self.state.products.some(p => p.id === id)) id = id + '-' + Math.floor(Math.random() * 999);
      const sd = (np.shortDesc || '').trim();
      const sku = (np.sku || '').trim() || ('AUTO-' + Date.now().toString().slice(-6));
      const { error: prodErr } = await supabaseClient.from('products').insert({ id, sku, category_id: np.category, name, short_desc: sd || 'Pieza artesanal de hormigón.', long_desc: sd || 'Pieza artesanal hecha a mano en hormigón.', price, featured: false, active: true });
      if (prodErr) { self.showToast('Error al crear producto: ' + prodErr.message); return; }

      if (colors.length) {
        await supabaseClient.from('product_colors').insert(colors.map((c, i) => ({ product_id: id, color_name: c.name, hex_value: c.hex || null, sort_order: i })));
      }
      if (aromas.length) {
        const newAromaNames = aromas.filter(a => !self.state.aromas.some(x => x.toLowerCase() === a.toLowerCase()));
        if (newAromaNames.length) await supabaseClient.from('aromas').insert(newAromaNames.map(name => ({ name })));
        await supabaseClient.from('product_aromas').insert(aromas.map((a, i) => ({ product_id: id, aroma_name: a, sort_order: i })));
      }

      const stockRows = comboList.length === 1
        ? [{ product_id: id, color_name: comboList[0].color, aroma_name: comboList[0].aroma, quantity: Math.max(0, parseInt(np.stock, 10) || 0) }]
        : comboList.map(cb => ({ product_id: id, color_name: cb.color, aroma_name: cb.aroma, quantity: Math.max(0, parseInt(np.stockMap[cb.color + '|' + (cb.aroma || '')], 10) || 0) }));
      await supabaseClient.from('stock').insert(stockRows);
      await Promise.all(stockRows.map(r => self.recordStockMovement(id, r.color_name, r.aroma_name, 'entrada', r.quantity, 'Alta de producto')));

      if (self.state.newProductPhoto) await self.uploadProductPhoto(id, null, self.state.newProductPhoto);

      self.setState({ newProduct: self.emptyNP(), newProductPhoto: null, prodAdding: false });
      await self.loadCatalog();
      self.showToast(name + ' · creado');
    },
    deleteProduct: (id) => { const p = self.getProduct(id); self.askConfirm({ title: 'Desactivar producto', message: '¿Desactivar "' + (p ? p.name : '') + '"? Deja de verse en la tienda, pero podés reactivarlo después desde "Inactivos".', yesLabel: 'Desactivar', danger: true, onYes: async () => { const { error } = await supabaseClient.from('products').update({ active: false }).eq('id', id); if (error) { self.showToast('Error: ' + error.message); return; } self.setState({ products: self.state.products.filter(x => x.id !== id), cart: self.state.cart.filter(c => c.id !== id) }); await self.loadInactive(); self.showToast('Producto desactivado'); } }); },
    reactivateProduct: async (id) => { const { error } = await supabaseClient.from('products').update({ active: true }).eq('id', id); if (error) { self.showToast('Error: ' + error.message); return; } await self.loadCatalog(); await self.loadInactive(); self.showToast('Producto reactivado'); },
    onAromaSearch: e => self.setState({ aromaSearch: e.target.value })
  };
};
