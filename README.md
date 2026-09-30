# 🐾 Peluditos

Web del **Ayuntamiento de Aranda de Duero** sobre el servicio municipal de recogida de animales
y el programa de colonias felinas del municipio, con un directorio informativo de las
protectoras y asociaciones de animales que trabajan en Aranda de forma independiente.

**En vivo:** <https://peluditos.arandadeduero.dev>

Sitio **estático** (HTML/CSS/JS vanilla, sin build ni framework), servido por **GitHub Pages**.
Los datos se editan a mano en el repo o se generan mediante un flujo de **GitHub Issues → PR →
publicación** (ver más abajo); no hay ningún proceso automático (cron) que reescriba datos.

## Páginas

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
- **Protectoras** (`/protectoras/`): directorio informativo de cada entidad con logo y contacto
  público. Son protectoras y asociaciones independientes, sin relación con el Ayuntamiento — la
  página lo indica explícitamente.
- **Mapa de colonias** (`/mapa-colonias/`): mapa ([Leaflet](https://leafletjs.com/) + teselas de
  OpenStreetMap, sin API key) de las colonias felinas gestionadas por el Ayuntamiento, con lista
  accesible debajo sincronizada con el mapa. Datos en [`data/colonias.json`](data/colonias.json)
  (un array de objetos `{id, nombre, zona, lat, lng, numGatos, programa, estado, fechaAlta,
  descripcion, contacto}`); 38 colonias reales (censo de FeliniSave, mayo 2025), geolocalizadas
  con [Nominatim](https://nominatim.org/) y datos de OpenStreetMap. No tienen gestor individual
  asignado. Los campos sin dato confirmado llevan el valor `"Desconocido"` (`colonias-map.js` lo
  muestra como «Número de gatos no conocido» en `numGatos`, en vez de romper el formateo
  numérico); una colonia sin `lat`/`lng` aparecería solo en la lista, sin marcador en el mapa.
- **Info** (`/info/`): 4 tarjetas de estadísticas reales del programa de colonias felinas (censo
  de FeliniSave, mayo 2025), un resumen del marco legal (Ley 7/2023) y el método CER, enlace de
  descarga a la presentación completa en PDF, y un aviso para reportar fallos por GitHub Issues.
  Editar directamente en `info/index.html` cuando haya datos más recientes.

## Fichas propuestas por issue (GitHub Issues → PR → publicación)

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

Ambos flujos se probaron de extremo a extremo en vivo (issue → PR → fusión → publicación →
archivado) antes de darlos por buenos.

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html`, `archivo/`, `protectoras/`, `mapa-colonias/`, `info/` | Las cinco páginas (comparten `styles.css`). |
| `nav.js` | Menú hamburguesa en móvil. |
| `analytics.js` | Google Analytics 4 con consentimiento explícito (banner «Aceptar»/«Denegar»). |
| `colonias-map.js` | Mapa de colonias felinas (Leaflet + OpenStreetMap) en `/mapa-colonias/`. |
| `recogidas.js` | Fichas del servicio municipal de recogida en la portada (`/`). |
| `archivo.js` | Listado enlazado a issues de GitHub en `/archivo/`. |
| `scripts/lib.mjs` | `parseIssueBody`: parser línea a línea del cuerpo de un issue form. |
| `scripts/parse-animal-issue.mjs` | Valida un issue "Animal recogido" y genera su ficha (ver arriba). |
| `scripts/parse-archive-issue.mjs` | Valida un issue "Archivar animal" y mueve la ficha al archivo. |
| `shelters.json` | Lista de protectoras: `username`, `name`, `zone`, `instagramUrl` + contacto, solo para el directorio en `/protectoras/`. |
| `data/colonias.json` | Colonias felinas que pinta `/mapa-colonias/` (edición manual). |
| `data/animales-recogidos.json` | Fichas del servicio municipal de recogida que pinta la portada (`/`) (edición manual o por issue). |
| `data/archivo.json` | Fichas retiradas de la portada, con enlace a su issue original, que pinta `/archivo/`. |
| `img/` | `logo-web.jpg` (icono/marca), `og.jpg` (vista previa social), `placeholder.svg` (imagen de respaldo), `cartel-colonia-felina.jpg` (en `/info/`), `shelters/<username>.jpg` (logos de protectoras), `recogida-issue-<n>.jpg` (fotos añadidas por el flujo de issues). |
| `docs/` | `gestion-colonias-felinas.pdf`, enlazado desde `/info/`. |
| `.github/ISSUE_TEMPLATE/` | `nuevo-animal.yml` ("🐾 Animal recogido") y `archivar-animal.yml` ("🗄️ Archivar animal"): formularios para proponer/retirar una ficha desde un issue. |
| `.github/workflows/` | `deploy-pages.yml` (despliega en cada push a `aranda`), `animal-issue.yml` + `archive-issue.yml` + `issue-flow-closed.yml` (fichas por issue). |

## Puesta en marcha

1. **Protectoras.** Edita [`shelters.json`](shelters.json) con los datos reales de cada entidad.
   Campos de contacto opcionales (se muestran en `/protectoras/` si están): `web`, `email`,
   `phone`, `whatsapp`, `contactForm`, `facebook`, `linktree`. El logo se busca en
   `img/shelters/<username>.jpg` (si no existe, cae al logo genérico).
2. **Pages** (*Settings → Pages*): **Source = GitHub Actions** (no "Deploy from a branch"). El
   despliegue lo hace `deploy-pages.yml` en cada push a `aranda`. Dominio propio vía fichero
   [`CNAME`](CNAME).
3. **Datos del servicio de recogida y de colonias**: se editan directamente en
   `data/animales-recogidos.json` / `data/colonias.json`, o (para animales recogidos) mediante el
   flujo de issues descrito arriba. No requiere ninguna clave de API ni secret configurado.

## Desarrollo local

```bash
node scripts/parse-animal-issue.mjs --self-test    # comprueba la validación de "Animal recogido"
node scripts/parse-archive-issue.mjs --self-test   # comprueba la validación de "Archivar animal"
python3 -m http.server                              # sirve el sitio en localhost:8000
```

## Operación y mantenimiento

- **Despliegue.** Lo hace `deploy-pages.yml` en cada push a `aranda` (incluidos los merges de PR
  del flujo de issues). Si el backend de Pages falla ("Deployment failed, try again later"), es
  transitorio: relanzar *Desplegar en GitHub Pages*.
- **Añadir/quitar protectora o contactos/logos:** editar `shelters.json` (y opcionalmente subir
  `img/shelters/<username>.jpg`). Nada más.
- **Verificar en vivo** saltando la caché del CDN: `curl "https://peluditos.arandadeduero.dev/data/animales-recogidos.json?cb=$RANDOM"`.
- **CSS/JS con caché.** Cloudflare cachea `styles.css` y los `.js` de forma independiente al
  despliegue de GitHub Pages: cualquier cambio en esos ficheros necesita subir su `?v=N` en
  **todas** las páginas que lo cargan, o el cambio no se verá en producción pese a estar
  desplegado.

## Notas

- **Contenido:** los logos de cada protectora son de su propiedad y se usan con su
  consentimiento para el directorio de `/protectoras/`. Licencia del proyecto:
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
para Aranda de Duero — aunque el propósito del sitio ha evolucionado bastante desde entonces:
nació como agregador de publicaciones de Instagram de protectoras y hoy es la web municipal del
servicio de recogida de animales y el programa de colonias felinas de Aranda de Duero.
