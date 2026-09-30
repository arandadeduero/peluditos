// Peluditos — listado de fichas archivadas (/archivo/). Cada ficha original queda documentada
// en su issue de GitHub; aquí solo se enlaza a él, no se repite localmente foto/descripción.
(function () {
  const listEl = document.getElementById('archivo-list');
  const emptyEl = document.getElementById('archivo-empty');
  if (!listEl) return;

  const escapeHtml = (s) =>
    (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmtFecha = (iso) => {
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  fetch('data/archivo.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((data) => {
      const items = Array.isArray(data) ? data : [];
      if (!items.length) { if (emptyEl) emptyEl.hidden = false; return; }

      items.sort((a, b) => Date.parse(b.fechaArchivado || 0) - Date.parse(a.fechaArchivado || 0));
      for (const it of items) {
        const li = document.createElement('li');
        li.className = 'archivo-list__item';
        li.innerHTML = `
          <div>
            <strong>${escapeHtml(it.lugarRecogida || 'Animal recogido')}</strong>
            <span class="archivo-list__meta">Recogido: ${escapeHtml(fmtFecha(it.fechaRecogida))} · Archivado: ${escapeHtml(fmtFecha(it.fechaArchivado))}</span>
            ${it.motivo ? `<span class="archivo-list__meta">${escapeHtml(it.motivo)}</span>` : ''}
          </div>
          ${it.issueUrl ? `<a href="${escapeHtml(it.issueUrl)}" target="_blank" rel="noopener">Ver ficha original →</a>` : ''}`;
        listEl.appendChild(li);
      }
    })
    .catch(() => { if (emptyEl) emptyEl.hidden = false; });
})();
