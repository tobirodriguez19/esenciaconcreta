// Fotos y video de producto/categoría/oficio: resolución de qué mostrar
// (slots, URLs), subida a Supabase Storage, editor de recorte.
window.EC = window.EC || {};
EC.images = function (self) {
  // ---- resolución de foto/slot a mostrar (usadas en toda la app) ----
  const mainSlot = (id) => 'ec-prod-' + id;
  const colorSlot = (id, color) => 'ec-prdc-' + id + '__' + self.slug(color);
  const photoBase = (id, color) => color ? colorSlot(id, color) : mainSlot(id);
  const realPhotoUrl = (p, color) => {
    if (color) { const list = (p.photos || []).filter(ph => ph.color_name === color); if (list.length) return list[list.length - 1].url; }
    const general = (p.photos || []).filter(ph => !ph.color_name);
    if (general.length) return general[general.length - 1].url;
    if (!color && self.PHOTO_IDS.has(p.id)) return '/uploads/products/' + p.id + '.jpg';
    return '';
  };
  const photoUrlFor = (p, color) => realPhotoUrl(p, color) || self.NO_PHOTO_IMG;

  // ---- subida a Storage: la parte idéntica en todos los uploads ----
  const uploadToStorage = async (path, blob, type) => {
    const { error } = await supabaseClient.storage.from('product-photos').upload(path, blob, { cacheControl: '3600', upsert: false, contentType: type });
    if (error) return { error };
    const { data } = supabaseClient.storage.from('product-photos').getPublicUrl(path);
    return { url: data.publicUrl };
  };

  return {
    mainSlot,
    colorSlot,
    isFilled: (slotId, seedHasSrc) => { if (self.state.filled[slotId]) return true; return !!seedHasSrc; },
    // Photo albums: 1+ photos per color (or general if no colors)
    photoBase,
    // Explicit per-color photo arrays of stable slot ids (true add/remove, no gaps)
    photoSlotIds: (p, color) => { const k = color || '_'; const arr = p.photoSlots && p.photoSlots[k]; if (arr && arr.length) return arr.slice(); return [photoBase(p.id, color)]; },
    // Real photo only (Storage upload, or the 12 original static uploads/). Empty string = nothing real.
    realPhotoUrl,
    // Display resolution: real photo, else the "Sin imagen" placeholder — always non-empty, safe to use as <image-slot src>.
    photoUrlFor,
    photoSeedSrc: (p, sid, color) => (sid === photoBase(p.id, color)) ? realPhotoUrl(p, color) : '',
    // All photos for a color (falls back to the general/no-color bucket if that color has none of its own)
    photosFor: (p, color) => {
      const own = (p.photos || []).filter(ph => color ? ph.color_name === color : !ph.color_name);
      if (own.length) return own;
      if (color) { const general = (p.photos || []).filter(ph => !ph.color_name); if (general.length) return general; }
      if (!color && self.PHOTO_IDS.has(p.id)) return [{ id: 'seed', url: '/uploads/products/' + p.id + '.jpg' }];
      return [];
    },
    filledPhotos: (p, color) => self.photoSlotIds(p, color).filter(sid => self.isFilled(sid, !!self.photoSeedSrc(p, sid, color))),
    firstPhoto: (p, color) => ({ slot: mainSlot(p.id), src: photoUrlFor(p, color) }),
    featuredPhoto: (p) => ({ slot: mainSlot(p.id), src: photoUrlFor(p) }),

    // ---- subida real (Supabase Storage) ----
    sanitizeFileName: (name, forceExt) => {
      const dot = name.lastIndexOf('.');
      const ext = (forceExt || (dot >= 0 ? name.slice(dot + 1) : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const noAccents = (dot >= 0 ? name.slice(0, dot) : name).toLowerCase().normalize('NFD').split('').filter(ch => { const c = ch.codePointAt(0); return c < 768 || c > 879; }).join('');
      const base = noAccents.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
      return (base || 'foto') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '.' + ext;
    },
    // Reduce a un tamaño razonable y convierte a WebP cuando el navegador lo soporta
    // (si no, deja el archivo tal cual). Corre 100% en el cliente, sin backend.
    optimizeImage: async (file) => {
      try {
        const bitmap = await createImageBitmap(file);
        const maxDim = 1600;
        const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
        const w = Math.max(1, Math.round(bitmap.width * scale)), h = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
        if (bitmap.close) bitmap.close();
        const supportsWebp = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        const mime = supportsWebp ? 'image/webp' : (file.type === 'image/png' ? 'image/png' : 'image/jpeg');
        const ext = supportsWebp ? 'webp' : (file.type === 'image/png' ? 'png' : 'jpg');
        const blob = await new Promise(res => canvas.toBlob(res, mime, 0.85));
        return blob ? { blob, ext, type: mime } : { blob: file, ext: (file.name.split('.').pop() || 'jpg').toLowerCase(), type: file.type };
      } catch (e) { console.error('optimizeImage failed', e); return { blob: file, ext: (file.name.split('.').pop() || 'jpg').toLowerCase(), type: file.type }; }
    },
    // Hash liviano (tamaño+nombre del contenido optimizado) para no resubir la misma foto dos veces.
    fileFingerprint: async (blob) => {
      try {
        const buf = await blob.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) { return null; }
    },
    storagePathFromUrl: (url) => { const marker = '/product-photos/'; const i = (url || '').indexOf(marker); return i >= 0 ? url.slice(i + marker.length) : null; },

    uploadProductPhoto: async (productId, color, file) => {
      const okTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!file || okTypes.indexOf(file.type) < 0) { self.showToast('Formato no permitido. Usá JPG, PNG o WEBP'); return; }
      const maxBytes = 5 * 1024 * 1024;
      if (file.size > maxBytes) { self.showToast('La imagen no puede superar 5MB'); return; }
      const { blob, ext, type } = await self.optimizeImage(file);
      const fingerprint = await self.fileFingerprint(blob);
      if (fingerprint) {
        let dupQ = supabaseClient.from('product_photos').select('id').eq('product_id', productId).eq('fingerprint', fingerprint);
        dupQ = color ? dupQ.eq('color_name', color) : dupQ.is('color_name', null);
        const { data: dupes } = await dupQ;
        if (dupes && dupes.length) { self.showToast('Esa foto ya está subida para esta variante'); return; }
      }
      const path = productId + '/' + (color ? self.slug(color) : 'general') + '/' + self.sanitizeFileName(file.name, ext);
      const { error: upErr, url } = await uploadToStorage(path, blob, type);
      if (upErr) { self.showToast('Error al subir imagen: ' + upErr.message); return; }
      const { error: insErr } = await supabaseClient.from('product_photos').insert({ product_id: productId, color_name: color || null, url, fingerprint, sort_order: Math.floor(Date.now() / 1000) });
      if (insErr) { self.showToast('La imagen se subió pero no se pudo guardar el registro: ' + insErr.message); return; }
      await self.loadCatalog();
      self.showToast('Foto actualizada');
    },
    removeStoragePhoto: async (productId, color) => {
      const p = self.getProduct(productId);
      const list = (p.photos || []).filter(ph => color ? ph.color_name === color : !ph.color_name);
      if (!list.length) { self.showToast('No hay foto subida para quitar'); return; }
      const last = list[list.length - 1];
      await supabaseClient.from('product_photos').delete().eq('id', last.id);
      const path = self.storagePathFromUrl(last.url);
      if (path) await supabaseClient.storage.from('product-photos').remove([path]);
      await self.loadCatalog();
      self.showToast('Foto eliminada');
    },
    removeStoragePhotoById: async (photoId) => {
      const { data, error: selErr } = await supabaseClient.from('product_photos').select('url').eq('id', photoId).single();
      if (selErr) { self.showToast('Error: ' + selErr.message); return; }
      await supabaseClient.from('product_photos').delete().eq('id', photoId);
      const path = self.storagePathFromUrl(data.url);
      if (path) await supabaseClient.storage.from('product-photos').remove([path]);
      await self.loadCatalog();
      self.showToast('Foto eliminada');
    },

    uploadProductVideo: async (productId, file) => {
      const okTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];
      if (!file || okTypes.indexOf(file.type) < 0) { self.showToast('Formato no permitido. Usá MP4, WEBM o MOV'); return; }
      const maxBytes = 50 * 1024 * 1024;
      if (file.size > maxBytes) { self.showToast('El video no puede superar 50MB'); return; }
      const ext = (file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
      const path = productId + '/video/' + self.sanitizeFileName(file.name, ext);
      const { error: upErr, url } = await uploadToStorage(path, file, file.type);
      if (upErr) { self.showToast('Error al subir video: ' + upErr.message); return; }
      const { error: updErr } = await supabaseClient.from('products').update({ video_url: url }).eq('id', productId);
      if (updErr) { self.showToast('El video se subió pero no se pudo guardar: ' + updErr.message); return; }
      await self.loadCatalog();
      self.showToast('Video actualizado');
    },
    removeProductVideo: async (productId) => {
      const p = self.getProduct(productId);
      if (!p || !p.videoUrl) { self.showToast('No hay video para quitar'); return; }
      const path = self.storagePathFromUrl(p.videoUrl);
      const { error } = await supabaseClient.from('products').update({ video_url: null }).eq('id', productId);
      if (error) { self.showToast('Error: ' + error.message); return; }
      if (path) await supabaseClient.storage.from('product-photos').remove([path]);
      await self.loadCatalog();
      self.showToast('Video eliminado');
    },

    // ---- editor de recorte ----
    openCropEditor: (photo) => { self.setState({ cropModal: { photoId: photo.id, url: photo.url, originalUrl: photo.original_url || null, rect: { x: 10, y: 10, w: 80, h: 80 } } }); },
    closeCropEditor: () => self.setState({ cropModal: null }),
    applyCrop: async () => {
      const cm = self.state.cropModal; if (!cm) return;
      const img = document.getElementById('ec-crop-img'); if (!img || !img.naturalWidth) { self.showToast('La imagen todavía no cargó'); return; }
      const nw = img.naturalWidth, nh = img.naturalHeight;
      const sx = Math.round(cm.rect.x / 100 * nw), sy = Math.round(cm.rect.y / 100 * nh);
      const sw = Math.max(1, Math.round(cm.rect.w / 100 * nw)), sh = Math.max(1, Math.round(cm.rect.h / 100 * nh));
      const canvas = document.createElement('canvas'); canvas.width = sw; canvas.height = sh;
      const ctx = canvas.getContext('2d');
      try { ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh); } catch (e) { self.showToast('No se pudo procesar la imagen'); return; }
      canvas.toBlob(async (blob) => {
        if (!blob) { self.showToast('No se pudo procesar la imagen'); return; }
        const path = 'crops/' + cm.photoId + '-' + Date.now() + '.jpg';
        const { error: upErr, url } = await uploadToStorage(path, blob, 'image/jpeg');
        if (upErr) { self.showToast('Error al subir el recorte: ' + upErr.message); return; }
        const patch = { url }; if (!cm.originalUrl) patch.original_url = cm.url;
        const { error: updErr } = await supabaseClient.from('product_photos').update(patch).eq('id', cm.photoId);
        if (updErr) { self.showToast('Error al guardar: ' + updErr.message); return; }
        self.setState({ cropModal: null });
        await self.loadCatalog();
        self.showToast('Recorte aplicado');
      }, 'image/jpeg', 0.9);
    },
    restoreOriginal: async () => {
      const cm = self.state.cropModal; if (!cm || !cm.originalUrl) return;
      const { error } = await supabaseClient.from('product_photos').update({ url: cm.originalUrl }).eq('id', cm.photoId);
      if (error) { self.showToast('Error: ' + error.message); return; }
      self.setState({ cropModal: null });
      await self.loadCatalog();
      self.showToast('Foto restaurada al original');
    },

    uploadCategoryPhoto: async (catId, file) => {
      const okTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!file || okTypes.indexOf(file.type) < 0) { self.showToast('Formato no permitido. Usá JPG, PNG o WEBP'); return; }
      if (file.size > 5 * 1024 * 1024) { self.showToast('La imagen no puede superar 5MB'); return; }
      const { blob, ext, type } = await self.optimizeImage(file);
      const path = 'categories/' + catId + '/' + self.sanitizeFileName(file.name, ext);
      const { error: upErr, url } = await uploadToStorage(path, blob, type);
      if (upErr) { self.showToast('Error al subir imagen: ' + upErr.message); return; }
      const { error: updErr } = await supabaseClient.from('categories').update({ photo_url: url }).eq('id', catId);
      if (updErr) { self.showToast('La imagen se subió pero no se pudo guardar: ' + updErr.message); return; }
      await self.loadCatalog();
      self.showToast('Foto de categoría actualizada');
    },
    removeCategoryPhoto: async (catId) => {
      const { error } = await supabaseClient.from('categories').update({ photo_url: null }).eq('id', catId);
      if (error) { self.showToast('Error al quitar: ' + error.message); return; }
      await self.loadCatalog();
      self.showToast('Foto eliminada');
    },

    uploadOficioPhoto: async (file) => {
      const okTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!file || okTypes.indexOf(file.type) < 0) { self.showToast('Formato no permitido. Usá JPG, PNG o WEBP'); return; }
      if (file.size > 5 * 1024 * 1024) { self.showToast('La imagen no puede superar 5MB'); return; }
      const { blob, ext, type } = await self.optimizeImage(file);
      const path = 'site/oficio/' + self.sanitizeFileName(file.name, ext);
      const { error: upErr, url } = await uploadToStorage(path, blob, type);
      if (upErr) { self.showToast('Error al subir imagen: ' + upErr.message); return; }
      const { error: updErr } = await supabaseClient.from('site_content').update({ oficio_photo_url: url }).eq('id', 1);
      if (updErr) { self.showToast('La imagen se subió pero no se pudo guardar: ' + updErr.message); return; }
      self.setState({ oficioPhotoUrl: url });
      self.showToast('Foto actualizada');
    },
    removeOficioPhoto: async () => {
      const { error } = await supabaseClient.from('site_content').update({ oficio_photo_url: null }).eq('id', 1);
      if (error) { self.showToast('Error al quitar: ' + error.message); return; }
      self.setState({ oficioPhotoUrl: '' });
      self.showToast('Foto eliminada');
    }
  };
};
