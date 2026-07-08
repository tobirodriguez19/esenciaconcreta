// Scroll forzado (para navegación SPA), drag-scroll horizontal, swipe de
// carrusel/galería y el editor de recorte de fotos — todo lo que escucha
// eventos de puntero/scroll a nivel documento.
window.EC = window.EC || {};
EC.gestures = function (self) {
  return {
    forceScroll: (getTarget) => {
      let cancelled = false;
      const cancel = () => { cancelled = true; cleanup(); };
      const cleanup = () => { ['wheel', 'touchstart', 'touchmove', 'pointerdown'].forEach(evt => window.removeEventListener(evt, cancel)); };
      ['wheel', 'touchstart', 'touchmove', 'pointerdown'].forEach(evt => window.addEventListener(evt, cancel, { passive: true }));
      const apply = (y) => {
        window.scrollTo(0, y);
        if (document.scrollingElement) document.scrollingElement.scrollTop = y;
        document.documentElement.scrollTop = y;
        document.body.scrollTop = y;
      };
      const run = (frames) => {
        let n = 0;
        const tick = () => {
          if (cancelled) return;
          try { const y = getTarget(); if (y != null) apply(y); } catch (e) { }
          n++;
          if (n < frames) requestAnimationFrame(tick);
        };
        tick();
      };
      run(45);
      setTimeout(cleanup, 800);
    },
    scrollTop: () => { self.forceScroll(() => 0); },

    scrollCat: (dir) => { const el = document.getElementById('ec-cat-scroll'); if (el) el.scrollBy({ left: dir * Math.max(220, el.clientWidth * 0.8), behavior: 'smooth' }); },

    setupGestures: () => {
      let el = null, startX = 0, startScroll = 0, dragging = false, moved = false;
      const down = e => { if (e.pointerType === 'touch') return; const t = e.target.closest && e.target.closest('.ec-dragscroll'); if (!t) return; el = t; startX = e.clientX; startScroll = t.scrollLeft; dragging = true; moved = false; el.style.cursor = 'grabbing'; };
      const move = e => { if (!dragging || !el) return; const dx = e.clientX - startX; if (Math.abs(dx) > 4) moved = true; el.scrollLeft = startScroll - dx; };
      const up = () => { if (dragging && el) el.style.cursor = ''; if (dragging && moved) { const blk = ev => { ev.stopPropagation(); ev.preventDefault(); window.removeEventListener('click', blk, true); }; window.addEventListener('click', blk, true); setTimeout(() => window.removeEventListener('click', blk, true), 60); } dragging = false; el = null; };
      // swipe (product gallery + hero carousel)
      let sx = 0, sy = 0, swActive = false, swKind = null;
      const sdown = e => { const g = e.target.closest && e.target.closest('.ec-swipe'); const h = e.target.closest && e.target.closest('.ec-hero-swipe'); if (!g && !h) return; sx = e.clientX; sy = e.clientY; swActive = true; swKind = g ? 'gallery' : 'hero'; };
      const sup = e => { if (!swActive) return; swActive = false; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) <= 40 || Math.abs(dx) <= Math.abs(dy)) return;
        if (swKind === 'gallery' && self._galLen > 1) self.galleryStep(dx < 0 ? 1 : -1, self._galLen);
        else if (swKind === 'hero' && self._heroLen > 1) { const n = self._heroLen; self.setState(s => ({ heroIndex: ((s.heroIndex + (dx < 0 ? 1 : -1)) % n + n) % n })); self.startHero(); }
      };
      self._gd = e => { down(e); sdown(e); }; self._gm = move; self._gu = e => { up(e); sup(e); };
      document.addEventListener('pointerdown', self._gd); document.addEventListener('pointermove', self._gm); document.addEventListener('pointerup', self._gu); document.addEventListener('pointercancel', self._gu);
    },

    loadFilled: () => { try { fetch('/.image-slots.state.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(j => { if (j && typeof j === 'object') { const f = { ...self.state.filled }; let ch = false; for (const id in j) { const v = j[id]; const has = v && (typeof v === 'string' ? v : (v.u)); if (has && !f[id]) { f[id] = true; ch = true; } } if (ch) self.setState({ filled: f }); } }).catch(() => { }); } catch (e) { } },

    setupCropGestures: () => {
      let mode = null, startX = 0, startY = 0, rect0 = null, cw = 0, ch = 0;
      const down = e => {
        if (!self.state.cropModal) return;
        const handle = e.target.closest && e.target.closest('[data-crop-handle]');
        const mover = e.target.closest && e.target.closest('[data-crop-move]');
        if (!handle && !mover) return;
        e.preventDefault(); e.stopPropagation();
        const wrap = document.getElementById('ec-crop-imgwrap'); if (!wrap) return;
        cw = wrap.clientWidth; ch = wrap.clientHeight;
        mode = handle ? handle.getAttribute('data-crop-handle') : 'move';
        startX = e.clientX; startY = e.clientY; rect0 = { ...self.state.cropModal.rect };
      };
      const move = e => {
        if (!mode) return;
        const dxPct = (e.clientX - startX) / cw * 100, dyPct = (e.clientY - startY) / ch * 100;
        let { x, y, w, h } = rect0;
        if (mode === 'move') { x = rect0.x + dxPct; y = rect0.y + dyPct; }
        else {
          if (mode.indexOf('w') >= 0) { x = rect0.x + dxPct; w = rect0.w - dxPct; }
          if (mode.indexOf('e') >= 0) { w = rect0.w + dxPct; }
          if (mode.indexOf('n') >= 0) { y = rect0.y + dyPct; h = rect0.h - dyPct; }
          if (mode.indexOf('s') >= 0) { h = rect0.h + dyPct; }
        }
        x = Math.max(0, Math.min(100, x)); y = Math.max(0, Math.min(100, y));
        w = Math.max(8, Math.min(100 - x, w)); h = Math.max(8, Math.min(100 - y, h));
        self.setState({ cropModal: { ...self.state.cropModal, rect: { x, y, w, h } } });
      };
      const up = () => { mode = null; };
      self._cropD = down; self._cropM = move; self._cropU = up;
      document.addEventListener('pointerdown', self._cropD);
      document.addEventListener('pointermove', self._cropM);
      document.addEventListener('pointerup', self._cropU);
      document.addEventListener('pointercancel', self._cropU);
    },

    scanSlots: () => { try { const present = {}, filledNow = {}; document.querySelectorAll('image-slot').forEach(el => { if (!el.id) return; present[el.id] = true; if (el.hasAttribute('data-filled')) filledNow[el.id] = true; }); const cur = self.state.filled || {}; const next = Object.assign({}, cur); let changed = false; for (const id in present) { const f = !!filledNow[id]; if ((!!cur[id]) !== f) { if (f) next[id] = true; else delete next[id]; changed = true; } } if (changed) self.setState({ filled: next }); } catch (e) { } }
  };
};
