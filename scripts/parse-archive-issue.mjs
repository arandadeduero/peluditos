#!/usr/bin/env node
// Peluditos — valida un issue "Archivar animal" y, si el id existe en la portada, mueve esa
// ficha de data/posts.json a data/archive/<AAAA>.json (reconstruyendo el archivo entero, igual
// que hace scripts/fetch.mjs, para que el índice de años quede siempre consistente).
// No publica nada por sí mismo: el workflow que lo invoca crea una rama + PR con el resultado,
// para revisión manual antes de fusionar.
//
// Entrada por variables de entorno (las pone el workflow, nunca se interpolan en shell):
//   ISSUE_BODY
//
// Salida: imprime un JSON de una línea en stdout con el resultado
//   { ok:true,  postId, shelter, year }
//   { ok:false, errors:[...] }

import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { groupByYear } from './fetch.mjs';
import { parseIssueBody } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data', 'posts.json');
const ARCHIVE_DIR = path.join(ROOT, 'data', 'archive');

async function loadArchivePosts() {
  if (!existsSync(ARCHIVE_DIR)) return [];
  const files = (await readdir(ARCHIVE_DIR)).filter((f) => /^\d{4}\.json$/.test(f));
  const arrs = await Promise.all(files.map((f) => readFile(path.join(ARCHIVE_DIR, f), 'utf8').then(JSON.parse)));
  return arrs.flat();
}

export function validate(fields, posts) {
  const errors = [];
  const postId = (fields['Id de la ficha'] || '').trim();
  if (!postId) {
    errors.push('Falta el **id de la ficha**.');
    return { errors, post: null };
  }
  const post = posts.find((p) => p.id === postId);
  if (!post) {
    errors.push(
      `No se ha encontrado ninguna ficha con id «${postId}» en la portada. Comprueba que esté ` +
        'bien copiado (tal cual aparece tras `#post-` en el enlace) o que no esté ya archivada.'
    );
  }
  return { errors, post };
}

async function main() {
  const issueBody = process.env.ISSUE_BODY || '';

  const posts = JSON.parse(await readFile(DATA, 'utf8').catch(() => '[]'));
  const fields = parseIssueBody(issueBody);
  const { errors, post } = validate(fields, posts);

  if (errors.length) {
    console.log(JSON.stringify({ ok: false, errors }));
    return;
  }

  const remaining = posts.filter((p) => p.id !== post.id);
  await writeFile(DATA, JSON.stringify(remaining, null, 2) + '\n');

  const archived = [...(await loadArchivePosts()), post];
  await mkdir(ARCHIVE_DIR, { recursive: true });
  const byYear = groupByYear(archived);
  const years = Object.keys(byYear).sort().reverse();
  const byDateDesc = (a, b) => Date.parse(b.date) - Date.parse(a.date);
  for (const y of years) {
    byYear[y].sort(byDateDesc);
    await writeFile(path.join(ARCHIVE_DIR, `${y}.json`), JSON.stringify(byYear[y], null, 2) + '\n');
  }
  await writeFile(
    path.join(ARCHIVE_DIR, 'index.json'),
    JSON.stringify(years.map((y) => ({ year: Number(y), count: byYear[y].length })), null, 2) + '\n'
  );
  const yearSet = new Set(years.map((y) => `${y}.json`));
  for (const f of (await readdir(ARCHIVE_DIR)).filter((f) => /^\d{4}\.json$/.test(f))) {
    if (!yearSet.has(f)) await unlink(path.join(ARCHIVE_DIR, f)).catch(() => {});
  }

  const year = (post.date || '').slice(0, 4);
  console.log(JSON.stringify({ ok: true, postId: post.id, shelter: post.shelter, year }));
}

// ---------- self-test ----------
function selfTest() {
  const assert = (c, m) => { if (!c) throw new Error('self-test FALLÓ: ' + m); };

  const body = [
    '### Id de la ficha',
    '',
    'issue-1',
    '',
    '### Nombre del animal (opcional)',
    '',
    '_No response_',
    '',
    '### Descripción (opcional)',
    '',
    'Ya adoptado',
  ].join('\n');

  const fields = parseIssueBody(body);
  assert(fields['Id de la ficha'] === 'issue-1', 'parseIssueBody: id');
  assert(fields['Descripción (opcional)'] === 'Ya adoptado', 'parseIssueBody: descripcion');

  const posts = [{ id: 'issue-1', shelter: 'FeliniSave', date: '2026-09-22T00:00:00.000Z' }];
  const ok = validate(fields, posts);
  assert(ok.errors.length === 0 && ok.post.id === 'issue-1', 'validate: id existente sin errores');

  const missing = validate(parseIssueBody(body.replace('issue-1', 'issue-999')), posts);
  assert(missing.errors.some((e) => e.includes('No se ha encontrado')), 'validate: id inexistente da error');

  const empty = validate(parseIssueBody(body.replace('issue-1', '')), posts);
  assert(empty.errors.some((e) => e.includes('Falta')), 'validate: id vacío da error');

  console.log('self-test OK');
}

if (process.argv.includes('--self-test')) selfTest();
else main().catch((e) => { console.log(JSON.stringify({ ok: false, errors: [`Error interno: ${e.message}`] })); process.exit(1); });
