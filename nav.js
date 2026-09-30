// Menú hamburguesa (solo visible en móvil) + desplegable de RRSS.
(function () {
  const btn = document.querySelector('.nav-toggle');
  const nav = document.getElementById('mainnav');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  const dropdown = document.querySelector('[data-nav-dropdown]');
  if (!dropdown) return;
  const toggle = dropdown.querySelector('.nav-dropdown__toggle');
  const menu = dropdown.querySelector('.nav-dropdown__menu');
  if (!toggle || !menu) return;

  // .mainnav usa overflow-x: auto (scroll horizontal en escritorio si no caben los enlaces),
  // lo que también recorta el eje Y (regla CSS: overflow-x distinto de visible fuerza
  // overflow-y a auto) — así que el menú absoluto quedaba cortado. En escritorio lo posicionamos
  // con position:fixed (referido al viewport, no al contenedor con overflow) calculado desde el
  // botón; en móvil (menú apilado) dejamos el position:static que ya pone el CSS.
  const isMobileNav = () => window.matchMedia('(max-width: 767px)').matches;
  const positionMenu = () => {
    if (isMobileNav()) { menu.style.position = ''; menu.style.top = ''; menu.style.right = ''; return; }
    const rect = toggle.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;
  };

  const close = () => {
    dropdown.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = dropdown.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) positionMenu();
  });
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
})();
