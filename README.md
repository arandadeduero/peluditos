# 🐾 Peluditos

Agrega en una sola página las publicaciones recientes de Instagram de las protectoras y
asociaciones de animales de **Aranda de Duero**, para que quien busca adoptar no tenga que
entrar en varias cuentas distintas. Una web del **Ayuntamiento de Aranda de Duero**.

**En vivo:** <https://peluditos.arandadeduero.dev>

Sitio **estático** (HTML/CSS/JS vanilla, sin build ni framework) que lee unos JSON generados a
diario por un script Node **sin dependencias**, ejecutado por **GitHub Actions** y servido por
**GitHub Pages**.

## Cómo funciona

```
shelters.json ─┐
               ├─ scripts/fetch.mjs  (cron diario, GitHub Actions)
               │     1. Apify        → últimos posts de cada @cuenta
               │     2. solo NUEVOS  → ingiere solo lo de los últimos 2 días (no backfill)
               │     3. imágenes     → descarga a img/<shortcode>.jpg
               │     4. Gemini       → clasifica {animal, categoría} (imagen + texto)
               │     5. reparte      → data/posts.json (portada, ≤4 meses)
               │                       data/archive/AAAA.json (más antiguos, por años)
               └─ commit + deploy (en la misma tanda) → GitHub Pages → navegador
```

- **Portada** (`/`): el apartado del **servicio municipal de recogida de animales** — cómo avisar
  si se encuentra un animal en la calle (Policía Local de Aranda de Duero, 947 51 26 46, 24 horas)
  sobre fondo destacado, y debajo, ya sobre el fondo normal de la página y al final del todo, las
  fichas de los animales que están bajo custodia de ese servicio (fotografía, fecha y lugar de
  recogida, situación). Datos en [`data/animales-recogidos.json`](data/animales-recogidos.json)
  (un array de objetos `{id, foto, fechaRecogida, lugarRecogida, situacion, descripcion,
  issueUrl}`; `issueUrl` solo lo llevan las fichas creadas por issue). Es un servicio
  exclusivamente municipal, sin relación con las protectoras/asociaciones (esas tienen su propia
  página, ver más abajo, y no aparecen ni aquí ni en el flujo de issues).
- **Archivo** (`/archivo/`): listado de animales que ya no están bajo custodia municipal
  (adoptados, reclamados por su propietario, trasladados...). Archivar es siempre **manual** (no
  hay ninguna regla automática por antigüedad) y cada entrada enlaza a su issue de GitHub
  original, que es donde vive la foto/descripción — el archivo en sí no las repite. Datos en
  [`data/archivo.json`](data/archivo.json) (un array de objetos `{id, issueUrl, fechaRecogida,
  lugarRecogida, motivo, fechaArchivado}`).
- **Protectoras** (`/protectoras/`): ficha de cada entidad con logo y contacto público.
- **Mapa de colonias** (`/mapa-colonias/`): mapa ([Leaflet](https://leafletjs.com/) + teselas de
  OpenStreetMap, sin API key) de las colonias felinas gestionadas por el Ayuntamiento, con lista
  accesible debajo sincronizada con el mapa. Datos en [`data/colonias.json`](data/colonias.json)
  (un array de objetos `{id, nombre, zona, lat, lng, numGatos, programa, estado, fechaAlta,
  descripcion, contacto}`); 38 colonias reales (censo de FeliniSave, mayo 2025), geolocalizadas
  con [Nominatim](https://nominatim.org/) y datos de OpenStreetMap. No tienen gestor individual
  asignado. Los campos sin dato confirmado llevan el valor `"Desconocido"` (`colonias-map.js` lo
  muestra como «Número de gatos no conocido» en `numGatos`, en vez de romper el formateo numérico);
  una colonia sin `lat`/`lng` aparecería solo en la lista, sin
  marcador en el mapa.
- **Info** (`/info/`): página estática con 4 tarjetas de estadísticas reales del programa de
  colonias felinas (censo de FeliniSave, mayo 2025 — editar directamente en `info/index.html`
  cuando haya datos más recientes). Pensada para ampliarse con más información estática en el
  futuro.

### Fichas propuestas por issue (GitHub Issues → PR → publicación)

Este flujo es **solo para animales recogidos por el servicio municipal de recogida** — nunca
para protectoras/asociaciones, que no tienen ninguna presencia en los issues. Cualquiera con
acceso al repo puede proponer una ficha sin tocar código, abriendo un issue con la plantilla
**🐾 Animal recogido**:

```
Issue "🐾 Animal recogido" ─┐
  (fecha y lugar de         ├─ animal-issue.yml          (al abrir/editar el issue)
   recogida, situación,     │     1. valida    → campos obligatorios, fecha AAAA-MM-DD,
   descripción op., 1 foto) │                    EXACTAMENTE una foto adjunta
                            │     2. si falla   → comenta qué falta y etiqueta necesita-cambios
                            │                    (se revalida solo al editar el issue)
                            │     3. si vale    → descarga la foto a
                            │                    img/recogida-issue-<n>.jpg, añade la ficha a
                            │                    data/animales-recogidos.json en una rama nueva
                            │                    y abre un Pull Request (label pr-abierto)
                            └─ el PR NO se fusiona solo: hace falta revisión y aprobación manual

PR fusionado (manual) ─┐
                        ├─ issue-flow-closed.yml
                        │     cierra el issue explícitamente (un squash-merge no dispara el
                        │     cierre automático por palabra clave) y añade el aviso final:
                        │     publicado (si se fusionó) o
                        │     necesita-cambios (si se cerró sin fusionar, para reintentarlo)
                        └─ deploy-pages.yml despliega igual que con cualquier otro push a aranda
```

Solo se admite **una** foto por issue (si detecta más de una, pide dejar solo una).

Retirar una ficha de la portada es siempre **manual** — nunca automático ni por antigüedad —
mediante un segundo flujo, plantilla **🗄️ Archivar animal**: pide el **id** de la ficha (es
`recogida-issue-` + el número del issue que la publicó) y opcionalmente un motivo (adoptado,
reclamado, trasladado a una protectora...). `archive-issue.yml` valida que ese id exista en
`data/animales-recogidos.json` y, si es así, abre un PR que la quita de ahí y añade una entrada
a [`data/archivo.json`](data/archivo.json) con un enlace al issue original — mismo esquema de
validación → PR → revisión manual → `issue-flow-closed.yml` que el alta.

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html`, `archivo/`, `protectoras/`, `mapa-colonias/`, `info/` | Las cinco páginas (comparten `styles.css`). |
| `nav.js` | Menú hamburguesa en móvil. |
| `analytics.js` | Google Analytics 4 con consentimiento explícito (banner «Aceptar»/«Denegar»). |
| `colonias-map.js` | Mapa de colonias felinas (Leaflet + OpenStreetMap) en `/mapa-colonias/`. |
| `recogidas.js` | Fichas del servicio municipal de recogida en la portada (`/`). |
| `archivo.js` | Listado enlazado a issues de GitHub en `/archivo/`. |
| `scripts/fetch.mjs` | Pipeline de Instagram (fetch + clasificación + partición + poda) — **sin consumidor activo**: nada muestra ya `data/posts.json` en el sitio, ver Notas. |
| `scripts/lib.mjs` | Utilidades del pipeline (`excerpt`, `parseIssueBody`, clasificación Gemini). |
| `scripts/parse-animal-issue.mjs` | Valida un issue "Animal recogido" y genera su ficha (ver abajo). |
| `scripts/parse-archive-issue.mjs` | Valida un issue "Archivar animal" y mueve la ficha al archivo. |
| `shelters.json` | Lista de protectoras: `username`, `name`, `zone`, `instagramUrl` + contacto (solo para `/protectoras/`). |
| `data/posts.json` | Escrito a diario por `fetch.mjs`; ninguna página lo lee actualmente. |
| `data/colonias.json` | Colonias felinas que pinta `/mapa-colonias/` (edición manual). |
| `data/animales-recogidos.json` | Fichas del servicio municipal de recogida que pinta la portada (`/`) (edición manual o por issue). |
| `data/archivo.json` | Fichas retiradas de la portada, con enlace a su issue original, que pinta `/archivo/`. |
| `img/` | Imágenes de posts (`<shortcode>.jpg`, `issue-<n>.jpg`) + assets (`logo-web.jpg`, `hero.jpg`, `og.jpg`, `placeholder.svg`, `shelters/`). |
| `.github/ISSUE_TEMPLATE/` | `nuevo-animal.yml` y `archivar-animal.yml`: formularios para proponer/retirar una ficha desde un issue. |
| `.github/workflows/` | `update.yml` (cron Instagram + clasificación), `deploy-pages.yml` (despliega en cada push), `animal-issue.yml` + `archive-issue.yml` + `issue-flow-closed.yml` (fichas por issue). |

## Puesta en marcha

1. **Cuentas.** Edita [`shelters.json`](shelters.json) con los `@usuario` reales. Campos de
   contacto opcionales (se muestran en `/protectoras/` si están): `web`, `email`, `phone`,
   `whatsapp`, `contactForm`, `facebook`, `linktree`. El logo se busca en
   `img/shelters/<username>.jpg` (si no existe, cae al logo genérico).
2. **Apify** (datos de Instagram). Crea cuenta en [apify.com](https://apify.com), copia tu API
   token. Usa el actor `apify/instagram-scraper`; cambiar de proveedor = editar solo
   `fetchFromProvider` en `scripts/fetch.mjs`.
3. **Gemini** (clasificación IA). Clave en [Google AI Studio](https://aistudio.google.com/apikey).
   De **pago (prepago, nivel 1)** va rápido y sin saltarse posts; la **gratuita** también sirve
   pero es lenta y a veces salta posts por saturación (503). Sin clave, la web funciona pero sin
   categorías. Cambiar de IA = editar solo `classifyWithAI`. Modelo en `GEMINI_MODEL`
   (`gemini-2.5-flash-lite`).
4. **Secrets** (repo → *Settings → Secrets and variables → Actions*): `IG_API_TOKEN` y
   `GEMINI_API_KEY`. Opcional: `IG_API_TOKEN_2`, una 2ª cuenta Apify a la que el fetch hace
   failover si la 1ª agota su crédito gratuito.
5. **Pages** (*Settings → Pages*): **Source = GitHub Actions** (no "Deploy from a branch").
   El despliegue lo hacen los workflows. Dominio propio vía fichero [`CNAME`](CNAME).
6. **Contacto:** cada protectora gestiona sus adopciones; el sitio enlaza a la publicación
   original y da los contactos públicos de cada una. Textos del pie en las páginas HTML.

## Desarrollo local

```bash
node scripts/fetch.mjs --self-test                            # comprueba la lógica pura
IG_API_TOKEN=xxx GEMINI_API_KEY=yyy node scripts/fetch.mjs    # sincroniza y clasifica de verdad
CLASSIFY_ONLY=1 GEMINI_API_KEY=yyy node scripts/fetch.mjs     # sin Apify: solo clasifica pendientes
python3 -m http.server                                        # sirve el sitio en localhost:8000
```

## Operación y mantenimiento

- **El cron** (`update.yml`, `0 5 * * *` UTC) es *best-effort*: GitHub lo **retrasa horas** o lo
  salta. Para forzarlo: Actions → *Actualizar publicaciones* → *Run workflow* (o
  `gh workflow run "Actualizar publicaciones"`).
- **Despliegue.** Se hace por GitHub Actions. Ojo: los push del cron usan `GITHUB_TOKEN`, que
  **no dispara** `deploy-pages.yml` (regla anti-recursión de GitHub); por eso `update.yml`
  **despliega en su propio run**. Si el backend de Pages falla ("Deployment failed, try again
  later"), es transitorio: relanzar *Desplegar en GitHub Pages*.
- **Añadir/quitar protectora o contactos/logos:** editar `shelters.json` (y opcionalmente subir
  `img/shelters/<username>.jpg`). Nada más.
- **Verificar en vivo** saltando la caché del CDN: `curl "https://peluditos.arandadeduero.dev/data/animales-recogidos.json?cb=$RANDOM"`.

## Ajustes (en `scripts/fetch.mjs`)

- `INGEST_MAX_DAYS` (2): solo se ingieren posts de los últimos N días (no backfill de días viejos).
- `CURRENT_DAYS` (122): ventana de la portada; lo anterior va al archivo por años.
- `POSTS_PER_ACCOUNT` (25): cuántos posts recientes se piden por cuenta y ejecución.
- `CLASSIFY_FAST=1` (env, lo pone el workflow): sin la pausa de 7s (para clave de pago).

## Notas

- **Términos de Instagram:** leer cuentas ajenas sin permiso está en zona gris de sus términos.
  Uso sin ánimo de lucro; se enlaza siempre al post original y el contacto de adopción es
  directo con cada protectora. El proveedor de datos asume la parte técnica.
- **Contenido:** las imágenes y textos pertenecen a cada protectora. Licencia del proyecto:
  **[CC BY-SA 4.0](LICENSE)**.
- **Analítica:** Google Analytics 4 (`G-BXMC22W46S`, el mismo tracker que usa
  [fiestas.arandadeduero.es](https://github.com/arandadeduero/fiestas)) con consentimiento
  explícito: el script no se carga ni envía nada hasta que se pulsa «Aceptar» en el aviso
  inferior; «Denegar» se recuerda igual (`localStorage`, clave `peluditosAranda:analytics-consent`).
- **Fuera de alcance (por ahora):** buscador de texto, filtro por zona, pre-render para SEO.

## Créditos

Este proyecto es una adaptación de **Peluditos**, creado originalmente por vecinos voluntarios
de la comunidad de [Aldea Pucela](https://aldeapucela.org) para las protectoras de Valladolid.
Gracias a su equipo por el diseño y la infraestructura original en los que se basa esta versión
para Aranda de Duero.
