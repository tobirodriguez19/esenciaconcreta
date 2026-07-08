// Carrusel de destacados (home) y galería/video de la página de producto.
window.EC = window.EC || {};
EC.product = function (self) {
  return {
    startHero: () => { if (self._heroT) clearInterval(self._heroT); self._heroT = setInterval(() => { if (self.state.view === 'home') { const n = self.state.products.filter(p => p.featured).length || self.state.products.length || 1; self.setState(s => ({ heroIndex: (s.heroIndex + 1) % n })); } }, 8000); },
    setHero: (i) => { self.setState({ heroIndex: i }); self.startHero(); },
    heroPrev: () => { const n = self._heroLen || 1; self.setState(s => ({ heroIndex: (s.heroIndex - 1 + n) % n })); self.startHero(); },
    heroNext: () => { const n = self._heroLen || 1; self.setState(s => ({ heroIndex: (s.heroIndex + 1) % n })); self.startHero(); },

    pauseVideos: () => { try { document.querySelectorAll('video').forEach(v => v.pause()); } catch (e) { } },
    playVideo: (slotId) => { self.setState({ videoActivated: true }); setTimeout(() => { const v = document.getElementById(slotId); if (v) { v.muted = false; v.play().catch(() => { }); } }, 30); },
    setGallery: (i) => { self.pauseVideos(); self.setState({ galleryIndex: i, videoActivated: false }); },
    galleryStep: (d, n) => { self.pauseVideos(); self.setState({ galleryIndex: ((self.state.galleryIndex + d) % n + n) % n, videoActivated: false }); }
  };
};
