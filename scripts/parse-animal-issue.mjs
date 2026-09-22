#!/usr/bin/env node
// Peluditos — valida un issue "Nuevo animal" y, si es correcto, genera la ficha:
// descarga la foto a img/issue-<n>.jpg y añade la entrada a data/posts.json.
// No publica nada por sí mismo: el workflow que lo invoca crea una rama + PR con
// el resultado, para revisión manual antes de fusionar.
//
// Entrada por variables de entorno (las pone el workflow, nunca se interpolan en
// shell — así el cuerpo del issue, que es texto no confiable, solo se trata como
// datos):
//   ISSUE_NUMBER, ISSUE_BODY, ISSUE_URL, ISSUE_CREATED_AT
//
// Salida: imprime un JSON de una línea en stdout con el resultado
//   { ok:true,  postId, permalink }
//   { ok:false, errors:[...] }
// y dos formas de estado: si ok=true dejará escritos data/posts.json y la imagen;
// si ok=false no toca ningún fichero del sitio.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { excerpt } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHELTERS = path.join(ROOT, 'shelters.json');
const DATA = path.join(ROOT, 'data', 'posts.json');
const IMG_DIR = path.join(ROOT, 'img');

const ANIMAL_MAP = { perro: 'perro', gato: 'gato', otro: 'otro' };
const CATEGORIA_MAP = {
  'adopción': 'adopcion', adopcion: 'adopcion',
  acogida: 'acogida',
  perdido: 'perdido',
  'donación': 'donacion', donacion: 'donacion',
  evento: 'evento',
  otra: 'otro', otro: 'otro',
};

// Un issue form vuelca el cuerpo como Markdown: "### <etiqueta>" + línea en blanco +
// respuesta (o "_No response_" si el campo era opcional y se dejó vacío).
export function parseIssueBody(body) {
  const fields = {};
  const re = /^### (.+?)\r?\n+([\s\S]*?)(?=\r?\n### |\r?\n*$)/gm;
  let m;
  while ((m = re.exec(body || '')) !== null) {
    const label = m[1].trim();
    const value = m[2].trim();
    fields[label] = value === '_No response_' ? '' : value;
  }
  return fields;
}

// Solo confiamos en imágenes servidas por los propios CDN de adjuntos de GitHub.
const IMG_RE = /!\[[^\]]*\]\((https:\/\/(?:github\.com\/user-attachments\/assets\/[a-zA-Z0-9-]+|[a-zA-Z0-9.-]*\.githubusercontent\.com\/[^\s)]+))\)/g;

export function extractImages(body) {
  return [...(body || '').matchAll(IMG_RE)].map((m) => m[1]);
}

function isHttpUrl(s) {
  return /^https?:\/\/\S+$/i.test(s || '');
}

async function downloadImage(url, filename) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar la imagen (${res.status})`);
  await writeFile(path.join(IMG_DIR, filename), Buffer.from(await res.arrayBuffer()));
}

export function validate(fields, body, shelters) {
  const errors = [];

  const protectoraNombre = (fields['Protectora'] || '').trim();
  const shelter = shelters.find((s) => s.name.toLowerCase() === protectoraNombre.toLowerCase());
  if (!protectoraNombre) errors.push('Falta indicar la **protectora**.');
  else if (!shelter) errors.push(`La protectora «${protectoraNombre}» no coincide con ninguna de la lista (revisa \`shelters.json\`).`);

  const animalRaw = (fields['Tipo de animal'] || '').trim().toLowerCase();
  const animal = ANIMAL_MAP[animalRaw];
  if (!animalRaw) errors.push('Falta indicar el **tipo de animal**.');
  else if (!animal) errors.push(`Tipo de animal «${fields['Tipo de animal']}» no reconocido (usa el desplegable).`);

  const categoriaRaw = (fields['Categoría de la publicación'] || '').trim().toLowerCase();
  const categoria = CATEGORIA_MAP[categoriaRaw];
  if (!categoriaRaw) errors.push('Falta indicar la **categoría de la publicación**.');
  else if (!categoria) errors.push(`Categoría «${fields['Categoría de la publicación']}» no reconocida (usa el desplegable).`);

  const descripcion = (fields['Descripción'] || '').trim();
  if (!descripcion) errors.push('Falta la **descripción**.');

  // Contamos las imágenes en TODO el cuerpo (no solo en el campo «Foto»): así detectamos
  // también a quien arrastra la imagen en un campo equivocado o sube más de una.
  const images = extractImages(body);
  if (images.length === 0) errors.push('Falta **una foto**: arrástrala al campo «Foto» del formulario.');
  else if (images.length > 1) errors.push(`Se han detectado ${images.length} fotos y solo se admite **una**. Deja una sola imagen en el issue.`);

  const enlaceRaw = (fields['Enlace relacionado (opcional)'] || '').trim();
  const enlace = isHttpUrl(enlaceRaw) ? enlaceRaw : '';
  if (enlaceRaw && !enlace) errors.push('El **enlace relacionado** no parece una URL válida (debe empezar por http:// o https://).');

  return {
    errors,
    shelter,
    animal,
    categoria,
    descripcion,
    nombre: (fields['Nombre del animal (opcional)'] || '').trim(),
    imageUrl: images[0],
    enlace,
  };
}

async function main() {
  const issueNumber = process.env.ISSUE_NUMBER;
  const issueBody = process.env.ISSUE_BODY || '';
  const issueUrl = process.env.ISSUE_URL;
  const issueCreatedAt = process.env.ISSUE_CREATED_AT;
  if (!issueNumber || !issueUrl || !issueCreatedAt) throw new Error('Faltan variables de entorno ISSUE_*');

  const shelters = JSON.parse(await readFile(SHELTERS, 'utf8'));
  const fields = parseIssueBody(issueBody);
  const v = validate(fields, issueBody, shelters);

  if (v.errors.length) {
    console.log(JSON.stringify({ ok: false, errors: v.errors }));
    return;
  }

  const id = `issue-${issueNumber}`;
  const filename = `${id}.jpg`;
  await downloadImage(v.imageUrl, filename);

  const caption = v.nombre ? `${v.nombre}. ${v.descripcion}` : v.descripcion;
  const permalink = v.enlace || issueUrl;

  const post = {
    id,
    shelter: v.shelter.name,
    shelterUrl: v.shelter.instagramUrl,
    zone: v.shelter.zone || '',
    date: issueCreatedAt,
    caption,
    excerpt: excerpt(caption),
    image: `img/${filename}`,
    images: [`img/${filename}`],
    permalink,
    type: v.animal,
    tipo: v.categoria,
    source: 'issue',
  };

  const current = JSON.parse(await readFile(DATA, 'utf8').catch(() => '[]'));
  const filtered = current.filter((p) => p.id !== id); // por si se revalida un issue ya publicado
  const all = [post, ...filtered].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  await writeFile(DATA, JSON.stringify(all, null, 2) + '\n');

  console.log(JSON.stringify({ ok: true, postId: id, permalink }));
}

// ---------- self-test ----------
function selfTest() {
  const assert = (c, m) => { if (!c) throw new Error('self-test FALLÓ: ' + m); };

  const body = [
    '### Protectora',
    '',
    'Huellaranda',
    '',
    '### Nombre del animal (opcional)',
    '',
    '_No response_',
    '',
    '### Tipo de animal',
    '',
    'Perro',
    '',
    '### Categoría de la publicación',
    '',
    'Adopción',
    '',
    '### Descripción',
    '',
    'Muy bueno con niños.',
    '',
    '### Foto',
    '',
    '![img](https://github.com/user-attachments/assets/abc123)',
    '',
    '### Enlace relacionado (opcional)',
    '',
    '_No response_',
  ].join('\n');

  const fields = parseIssueBody(body);
  assert(fields['Protectora'] === 'Huellaranda', 'parseIssueBody: protectora');
  assert(fields['Nombre del animal (opcional)'] === '', 'parseIssueBody: "_No response_" -> ""');
  assert(fields['Descripción'] === 'Muy bueno con niños.', 'parseIssueBody: descripcion');

  assert(extractImages(body).length === 1, 'extractImages: detecta 1 imagen de attachments de GitHub');
  assert(extractImages('![x](https://evil.example.com/a.jpg)').length === 0, 'extractImages: ignora dominios no confiables');

  const shelters = [{ name: 'Huellaranda', instagramUrl: 'https://instagram.com/huellaranda', zone: 'Aranda de Duero' }];
  const v = validate(fields, body, shelters);
  assert(v.errors.length === 0, 'validate: formulario completo sin errores: ' + JSON.stringify(v.errors));
  assert(v.animal === 'perro' && v.categoria === 'adopcion', 'validate: normaliza animal/categoria');

  const bad = validate(parseIssueBody(body.replace('Huellaranda', 'OtraProtectora')), body, shelters);
  assert(bad.errors.some((e) => e.includes('no coincide')), 'validate: protectora desconocida da error');

  const noImg = validate(fields, body.replace(/!\[img\].*\)/, ''), shelters);
  assert(noImg.errors.some((e) => e.includes('Falta **una foto**')), 'validate: sin foto da error');

  const twoImgs = body + '\n![img2](https://github.com/user-attachments/assets/def456)';
  const dup = validate(parseIssueBody(twoImgs), twoImgs, shelters);
  assert(dup.errors.some((e) => e.includes('solo se admite')), 'validate: dos fotos da error');

  console.log('self-test OK');
}

if (process.argv.includes('--self-test')) selfTest();
else main().catch((e) => { console.log(JSON.stringify({ ok: false, errors: [`Error interno: ${e.message}`] })); process.exit(1); });
