(function () {
  const esc = (s) => (s || '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmtFecha = (iso) => {
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  fetch('data/animales-recogidos.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((animales) => {
      const wrap = document.getElementById('recogidas');
      const empty = document.getElementById('recogidas-empty');
      if (!wrap) return;
      if (!animales.length) { if (empty) empty.hidden = false; return; }
      for (const a of animales) {
        const card = document.createElement('div');
        card.className = 'recogida-card';
        card.innerHTML = `
          <img class="recogida-card__photo" loading="lazy" alt="Animal recogido por el servicio municipal"
               src="${esc(a.foto)}" onerror="this.onerror=null;this.src='img/placeholder.svg'">
          <div class="recogida-card__body">
            <span class="recogida-card__situacion">${esc(a.situacion)}</span>
            <p class="recogida-card__data"><strong>Fecha:</strong> ${esc(fmtFecha(a.fechaRecogida))}</p>
            <p class="recogida-card__data"><strong>Lugar:</strong> ${esc(a.lugarRecogida)}</p>
            ${a.descripcion ? `<p class="recogida-card__desc">${esc(a.descripcion)}</p>` : ''}
          </div>`;
        wrap.appendChild(card);
      }
    });
})();
