// Actualiza <title>, meta tags y el JSON-LD de producto según la vista actual.
window.EC = window.EC || {};
EC.seo = function (self) {
  return {
    updateSeo: () => {
      try {
        const s = self.state;
        const base = 'https://esenciaconcreta.com.ar';
        let title = 'Esencia Concreta — Piezas de hormigón hechas a mano en Rafaela';
        let desc = 'Velas, floreros, portavelas, bandejas y posavasos de hormigón hechos a mano en Rafaela, Santa Fe.';
        let path = '/';
        let product = null;
        if (s.view === 'catalog') { title = 'Catálogo — Esencia Concreta'; desc = 'Explorá todas nuestras piezas de hormigón hechas a mano: velas, floreros, portavelas y más.'; path = '/catalogo'; }
        else if (s.view === 'product' && s.productId) {
          const p = self.getProduct(s.productId);
          if (p) { product = p; title = p.name + ' — Esencia Concreta'; desc = p.shortDesc || 'Pieza artesanal de hormigón hecha a mano en Rafaela.'; path = '/producto/' + encodeURIComponent(p.id); }
        }
        else if (s.view === 'about') { title = 'Conocenos — Esencia Concreta'; desc = 'Conocé el oficio detrás de Esencia Concreta.'; path = '/conocenos'; }
        else if (s.view === 'contact') { title = 'Contacto — Esencia Concreta'; desc = 'WhatsApp, Instagram y ubicación de Esencia Concreta en Rafaela, Santa Fe.'; path = '/contacto'; }
        else if (s.view === 'checkout') { title = 'Finalizar compra — Esencia Concreta'; path = '/checkout'; }
        else if (s.view === 'confirm') { title = 'Pedido confirmado — Esencia Concreta'; path = '/confirmacion'; }
        else if (s.view === 'admin') { title = 'Panel de administración — Esencia Concreta'; path = '/admin'; }
        else if (s.view === 'notfound') { title = 'Página no encontrada — Esencia Concreta'; desc = 'La página que buscás no existe o fue movida.'; path = (typeof location !== 'undefined' ? location.pathname : '/'); }
        const key = title + '|' + path;
        if (self._seoKey === key) return;
        self._seoKey = key;
        document.title = title;
        const setMeta = (sel, attr, val) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val); };
        setMeta('meta[name="description"]', 'content', desc);
        setMeta('meta[property="og:title"]', 'content', title);
        setMeta('meta[property="og:description"]', 'content', desc);
        setMeta('meta[property="og:url"]', 'content', base + path);
        setMeta('meta[name="twitter:title"]', 'content', title);
        setMeta('meta[name="twitter:description"]', 'content', desc);
        setMeta('link[rel="canonical"]', 'href', base + path);
        let robotsMeta = document.querySelector('meta[name="robots"]');
        if (s.view === 'notfound') {
          if (!robotsMeta) { robotsMeta = document.createElement('meta'); robotsMeta.setAttribute('name', 'robots'); document.head.appendChild(robotsMeta); }
          robotsMeta.setAttribute('content', 'noindex');
        } else if (robotsMeta) { robotsMeta.remove(); }
        let ld = document.getElementById('ec-product-jsonld');
        if (product) {
          if (!ld) { ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.id = 'ec-product-jsonld'; document.head.appendChild(ld); }
          ld.textContent = JSON.stringify({
            '@context': 'https://schema.org', '@type': 'Product',
            name: product.name, description: product.shortDesc || product.longDesc || '',
            sku: product.sku || undefined, image: self.realPhotoUrl(product) || undefined,
            offers: {
              '@type': 'Offer', priceCurrency: 'ARS', price: product.price,
              availability: self.totalStock(product) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              url: base + path
            }
          });
        } else if (ld) { ld.remove(); }
      } catch (e) { console.error('updateSeo failed', e); }
    }
  };
};
