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

- **Portada** (`/`): tarjetas de las **últimas 2 semanas** (con botón «Mostrar más» que revela
  2 semanas más cada vez), agrupadas por día (hora de Madrid), con filtros por **animal**
  (perro/gato/otro) y **categoría** (adopción/acogida/perdido/donación/evento/otro) y por
  protectora. Cada publicación tiene su ancla `#post-<id>` (enlace directo compartible).
- **Archivo** (`/archivo/`): lo que supera los ~4 meses, por años.
- **Protectoras** (`/protectoras/`): ficha de cada entidad con logo y contacto público.

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html`, `archivo/`, `protectoras/` | Las tres páginas (comparten `styles.css` y `app.js`). |
| `app.js` | Render de tarjetas + filtros + «Mostrar más» + anclas (portada y archivo). |
| `nav.js` | Menú hamburguesa en móvil. |
| `analytics.js` | Google Analytics 4 con consentimiento explícito (banner «Aceptar»/«Denegar»). |
| `scripts/fetch.mjs` | Pipeline de Instagram (fetch + clasificación + partición + poda). |
| `scripts/lib.mjs` | Utilidades del pipeline (`excerpt`, clasificación Gemini). |
| `shelters.json` | Lista de protectoras: `username`, `name`, `zone`, `instagramUrl` + contacto. |
| `data/posts.json` · `data/archive/*.json` | Datos generados (portada / archivo). |
| `img/` | Imágenes de posts (`<shortcode>.jpg`) + assets (`logo-web.jpg`, `hero.jpg`, `og.jpg`, `placeholder.svg`, `shelters/`). |
| `.github/workflows/` | `update.yml` (cron Instagram + clasificación) y `deploy-pages.yml` (despliega en cada push). |

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
   `GEMINI_API_KEY`.
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
- **Verificar en vivo** saltando la caché del CDN: `curl "https://peluditos.arandadeduero.dev/data/posts.json?cb=$RANDOM"`.

## Ajustes (en `scripts/fetch.mjs`)

- `INGEST_MAX_DAYS` (2): solo se ingieren posts de los últimos N días (no backfill de días viejos).
- `CURRENT_DAYS` (122): ventana de la portada; lo anterior va al archivo por años.
- `POSTS_PER_ACCOUNT` (6): cuántos posts recientes se piden por cuenta y ejecución.
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
