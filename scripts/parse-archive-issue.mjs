#!/usr/bin/env node
// Peluditos — valida un issue "Archivar animal" y, si el id existe en
// data/animales-recogidos.json, mueve esa ficha a data/archivo.json (un listado plano:
// el archivo solo enlaza a los issues de GitHub, no repite localmente foto/descripción).
// No publica nada por sí mismo: el workflow que lo invoca crea una rama + PR con el
// resultado, para revisión manual antes de fusionar.
//
// Entrada por variables de entorno (las pone el workflow, nunca se interpolan en shell):
//   ISSUE_BODY
//
// Salida: imprime un JSON de una línea en stdout con el resultado
//   { ok:true,  postId, fechaRecogida, lugarRecogida }
//   { ok:false, errors:[...] }

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseIssueBody } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data', 'animales-recogidos.json');
const ARCHIVO = path.join(ROOT, 'data', 'archivo.json');

export function validate(fields, animales) {
  const errors = [];
  const postId = (fields['Id de la ficha'] || '').trim();
  if (!postId) {
    errors.push('Falta el **id de la ficha**.');
    return { errors, animal: null };
  }
  const animal = animales.find((a) => a.id === postId);
  if (!animal) {
    errors.push(
      `No se ha encontrado ninguna ficha con id «${postId}» entre los animales bajo custodia ` +
        'municipal. Comprueba que esté bien copiado o que no esté ya archivada.'
    );
  }
  return { errors, animal };
}

async function main() {
  const issueBody = process.env.ISSUE_BODY || '';

  const animales = JSON.parse(await readFile(DATA, 'utf8').catch(() => '[]'));
  const fields = parseIssueBody(issueBody);
  const { errors, animal } = validate(fields, animales);

  if (errors.length) {
    console.log(JSON.stringify({ ok: false, errors }));
    return;
  }

  const remaining = animales.filter((a) => a.id !== animal.id);
  await writeFile(DATA, JSON.stringify(remaining, null, 2) + '\n');

  const motivo = (fields['Motivo (opcional)'] || '').trim();
  const archivado = JSON.parse(await readFile(ARCHIVO, 'utf8').catch(() => '[]'));
  const entry = {
    id: animal.id,
    issueUrl: animal.issueUrl || '',
    fechaRecogida: animal.fechaRecogida || '',
    lugarRecogida: animal.lugarRecogida || '',
    motivo,
    fechaArchivado: new Date().toISOString().slice(0, 10),
  };
  await writeFile(ARCHIVO, JSON.stringify([entry, ...archivado.filter((a) => a.id !== animal.id)], null, 2) + '\n');

  console.log(JSON.stringify({ ok: true, postId: animal.id, fechaRecogida: entry.fechaRecogida, lugarRecogida: entry.lugarRecogida }));
}

// ---------- self-test ----------
function selfTest() {
  const assert = (c, m) => { if (!c) throw new Error('self-test FALLÓ: ' + m); };

  const body = [
    '### Id de la ficha',
    '',
    'recogida-issue-1',
    '',
    '### Motivo (opcional)',
    '',
    'Adoptado',
  ].join('\n');

  const fields = parseIssueBody(body);
  assert(fields['Id de la ficha'] === 'recogida-issue-1', 'parseIssueBody: id');
  assert(fields['Motivo (opcional)'] === 'Adoptado', 'parseIssueBody: motivo');

  const animales = [{ id: 'recogida-issue-1', fechaRecogida: '2026-09-22', lugarRecogida: 'Calle Ejemplo' }];
  const ok = validate(fields, animales);
  assert(ok.errors.length === 0 && ok.animal.id === 'recogida-issue-1', 'validate: id existente sin errores');

  const missing = validate(parseIssueBody(body.replace('recogida-issue-1', 'recogida-issue-999')), animales);
  assert(missing.errors.some((e) => e.includes('No se ha encontrado')), 'validate: id inexistente da error');

  const empty = validate(parseIssueBody(body.replace('recogida-issue-1', '')), animales);
  assert(empty.errors.some((e) => e.includes('Falta')), 'validate: id vacío da error');

  console.log('self-test OK');
}

if (process.argv.includes('--self-test')) selfTest();
else main().catch((e) => { console.log(JSON.stringify({ ok: false, errors: [`Error interno: ${e.message}`] })); process.exit(1); });
