// Peluditos — mapa de colonias felinas (Leaflet + teselas de OpenStreetMap).
(function () {
  const ARANDA_CENTER = [41.6708, -3.6892]; // Aranda de Duero (centro aprox.)
  const mapEl = document.getElementById('colonias-map');
  const listEl = document.getElementById('colonias-list');
  const emptyEl = document.getElementById('colonias-empty');
  if (!mapEl || typeof L === 'undefined') return;

  const escapeHtml = (s) =>
    (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const map = L.map(mapEl).setView(ARANDA_CENTER, 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map);

  const gatosLabel = (n) => {
    if (n == null || n === '') return '';
    if (typeof n === 'number') return `${n} gatos aprox.`;
    return n === 'Desconocido' ? 'Número de gatos no conocido' : String(n);
  };

  function popupHtml(c) {
    const gatos = gatosLabel(c.numGatos);
    return `
      <strong>${escapeHtml(c.nombre)}</strong><br>
      ${escapeHtml(c.zona || '')}
      ${gatos ? `<br>🐱 ${escapeHtml(gatos)}` : ''}
      ${c.descripcion ? `<br><span>${escapeHtml(c.descripcion)}</span>` : ''}`;
  }

  fetch('data/colonias.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((data) => {
      const colonias = Array.isArray(data) ? data : [];
      emptyEl.hidden = colonias.length > 0;
      if (!colonias.length) return;

      const bounds = [];
      for (const c of colonias) {
        const hasCoords = typeof c.lat === 'number' && typeof c.lng === 'number';
        let marker = null;
        if (hasCoords) {
          bounds.push([c.lat, c.lng]);
          marker = L.marker([c.lat, c.lng]).addTo(map).bindPopup(popupHtml(c));
        }

        const gatos = gatosLabel(c.numGatos);
        const li = document.createElement('li');
        li.className = 'colonias-list__item';
        li.innerHTML = `
          <strong>${escapeHtml(c.nombre)}</strong>
          <span class="colonias-list__zone">${escapeHtml(c.zona || '')}</span>
          ${gatos ? `<span>🐱 ${escapeHtml(gatos)}</span>` : ''}
          ${!hasCoords ? '<span class="colonias-list__nogeo">Ubicación pendiente de confirmar</span>' : ''}`;
        if (hasCoords) {
          li.tabIndex = 0;
          const focusColonia = () => {
            map.setView([c.lat, c.lng], 17);
            marker.openPopup();
          };
          li.addEventListener('click', focusColonia);
          li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focusColonia(); }
          });
        }
        listEl.appendChild(li);
      }

      if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30] });
      else if (bounds.length === 1) map.setView(bounds[0], 16);
    })
    .catch(() => { emptyEl.hidden = false; });
})();
