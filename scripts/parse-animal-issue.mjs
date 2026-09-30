#!/usr/bin/env node
// Peluditos — valida un issue "Animal recogido" y, si es correcto, genera la ficha:
// descarga la foto a img/recogida-issue-<n>.jpg y añade la entrada a
// data/animales-recogidos.json. Es exclusivamente para animales recogidos por el servicio
// municipal de recogida — no para protectoras/asociaciones, que gestionan sus adopciones
// por su cuenta y no aparecen aquí.
// No publica nada por sí mismo: el workflow que lo invoca crea una rama + PR con el
// resultado, para revisión manual antes de fusionar.
//
// Entrada por variables de entorno (las pone el workflow, nunca se interpolan en
// shell — así el cuerpo del issue, que es texto no confiable, solo se trata como
// datos):
//   ISSUE_NUMBER, ISSUE_BODY, ISSUE_URL
//
// Salida: imprime un JSON de una línea en stdout con el resultado
//   { ok:true,  postId, fechaRecogida, lugarRecogida }
//   { ok:false, errors:[...] }
// y dos formas de estado: si ok=true dejará escritos data/animales-recogidos.json y la
// imagen; si ok=false no toca ningún fichero del sitio.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseIssueBody } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data', 'animales-recogidos.json');
const IMG_DIR = path.join(ROOT, 'img');

// Solo confiamos en imágenes servidas por los propios CDN de adjuntos de GitHub. Según el
// cliente (arrastrar, pegar, móvil...) el issue las vuelca como Markdown "![]()" o como
// "<img src=...>" HTML (con width/height/alt en cualquier orden) — hay que detectar ambas.
const DOMAIN = '(?:github\\.com\\/user-attachments\\/assets\\/[a-zA-Z0-9-]+|[a-zA-Z0-9.-]*\\.githubusercontent\\.com\\/[^\\s)"\'<>]+)';
const MD_IMG_RE = new RegExp(`!\\[[^\\]]*\\]\\((https:\\/\\/${DOMAIN})\\)`, 'g');
const HTML_IMG_RE = new RegExp(`<img\\b[^>]*\\bsrc=["'](https:\\/\\/${DOMAIN})["'][^>]*>`, 'gi');

export function extractImages(body) {
  const text = body || '';
  const md = [...text.matchAll(MD_IMG_RE)].map((m) => m[1]);
  const html = [...text.matchAll(HTML_IMG_RE)].map((m) => m[1]);
  return [...new Set([...md, ...html])];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function downloadImage(url, filename) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar la imagen (${res.status})`);
  await writeFile(path.join(IMG_DIR, filename), Buffer.from(await res.arrayBuffer()));
}

export function validate(fields, body) {
  const errors = [];

  const fechaRecogida = (fields['Fecha de recogida'] || '').trim();
  if (!fechaRecogida) errors.push('Falta la **fecha de recogida**.');
  else if (!DATE_RE.test(fechaRecogida) || Number.isNaN(Date.parse(fechaRecogida))) {
    errors.push('La **fecha de recogida** debe tener el formato AAAA-MM-DD (ej. 2026-09-30).');
  }

  const lugarRecogida = (fields['Lugar de recogida'] || '').trim();
  if (!lugarRecogida) errors.push('Falta el **lugar de recogida**.');

  const situacion = (fields['Situación'] || '').trim();
  if (!situacion) errors.push('Falta la **situación**.');

  const descripcion = (fields['Descripción (opcional)'] || '').trim();

  // Contamos las imágenes en TODO el cuerpo (no solo en el campo «Foto»): así detectamos
  // también a quien arrastra la imagen en un campo equivocado o sube más de una.
  const images = extractImages(body);
  if (images.length === 0) errors.push('Falta **una foto**: arrástrala al campo «Foto» del formulario.');
  else if (images.length > 1) errors.push(`Se han detectado ${images.length} fotos y solo se admite **una**. Deja una sola imagen en el issue.`);

  return { errors, fechaRecogida, lugarRecogida, situacion, descripcion, imageUrl: images[0] };
}

async function main() {
  const issueNumber = process.env.ISSUE_NUMBER;
  const issueBody = process.env.ISSUE_BODY || '';
  const issueUrl = process.env.ISSUE_URL;
  if (!issueNumber || !issueUrl) throw new Error('Faltan variables de entorno ISSUE_*');

  const fields = parseIssueBody(issueBody);
  const v = validate(fields, issueBody);

  if (v.errors.length) {
    console.log(JSON.stringify({ ok: false, errors: v.errors }));
    return;
  }

  const id = `recogida-issue-${issueNumber}`;
  const filename = `${id}.jpg`;
  await downloadImage(v.imageUrl, filename);

  const entry = {
    id,
    foto: `img/${filename}`,
    fechaRecogida: v.fechaRecogida,
    lugarRecogida: v.lugarRecogida,
    situacion: v.situacion,
    descripcion: v.descripcion,
    issueUrl,
  };

  const current = JSON.parse(await readFile(DATA, 'utf8').catch(() => '[]'));
  const filtered = current.filter((p) => p.id !== id); // por si se revalida un issue ya publicado
  const all = [entry, ...filtered];
  await writeFile(DATA, JSON.stringify(all, null, 2) + '\n');

  console.log(JSON.stringify({ ok: true, postId: id, fechaRecogida: v.fechaRecogida, lugarRecogida: v.lugarRecogida }));
}

// ---------- self-test ----------
function selfTest() {
  const assert = (c, m) => { if (!c) throw new Error('self-test FALLÓ: ' + m); };

  const body = [
    '### Fecha de recogida',
    '',
    '2026-09-30',
    '',
    '### Lugar de recogida',
    '',
    'Calle Fuenteminaya, Aranda de Duero',
    '',
    '### Situación',
    '',
    'En custodia municipal',
    '',
    '### Descripción (opcional)',
    '',
    '_No response_',
    '',
    '### Foto',
    '',
    '![img](https://github.com/user-attachments/assets/abc123)',
  ].join('\n');

  const fields = parseIssueBody(body);
  assert(fields['Fecha de recogida'] === '2026-09-30', 'parseIssueBody: fecha');
  assert(fields['Lugar de recogida'] === 'Calle Fuenteminaya, Aranda de Duero', 'parseIssueBody: lugar');
  assert(fields['Situación'] === 'En custodia municipal', 'parseIssueBody: situacion');
  assert(fields['Descripción (opcional)'] === '', 'parseIssueBody: "_No response_" -> ""');

  assert(extractImages(body).length === 1, 'extractImages: detecta 1 imagen de attachments de GitHub (Markdown)');
  assert(extractImages('![x](https://evil.example.com/a.jpg)').length === 0, 'extractImages: ignora dominios no confiables');

  const htmlImgBody =
    '<img width="3072" height="4080" alt="Image" src="https://github.com/user-attachments/assets/b2d63c7a-86e0-4bfc-a542-b9cbedcc2209" />';
  assert(extractImages(htmlImgBody).length === 1, 'extractImages: detecta 1 imagen en formato <img> HTML');
  assert(extractImages('<img src="https://evil.example.com/a.jpg">').length === 0, 'extractImages: <img> ignora dominios no confiables');

  const v = validate(fields, body);
  assert(v.errors.length === 0, 'validate: formulario completo sin errores: ' + JSON.stringify(v.errors));
  assert(v.fechaRecogida === '2026-09-30' && v.lugarRecogida.includes('Fuenteminaya'), 'validate: campos correctos');

  const badDate = validate(parseIssueBody(body.replace('2026-09-30', '30/09/2026')), body);
  assert(badDate.errors.some((e) => e.includes('formato AAAA-MM-DD')), 'validate: fecha con formato inválido da error');

  const noImg = validate(fields, body.replace(/!\[img\].*\)/, ''));
  assert(noImg.errors.some((e) => e.includes('Falta **una foto**')), 'validate: sin foto da error');

  const twoImgs = body + '\n![img2](https://github.com/user-attachments/assets/def456)';
  const dup = validate(parseIssueBody(twoImgs), twoImgs);
  assert(dup.errors.some((e) => e.includes('solo se admite')), 'validate: dos fotos da error');

  console.log('self-test OK');
}

if (process.argv.includes('--self-test')) selfTest();
else main().catch((e) => { console.log(JSON.stringify({ ok: false, errors: [`Error interno: ${e.message}`] })); process.exit(1); });
