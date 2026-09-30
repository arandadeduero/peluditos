// Peluditos — utilidades compartidas por parse-animal-issue.mjs y parse-archive-issue.mjs.
// Sin efectos secundarios: solo funciones puras. Node 20+, sin dependencias.

// Un issue form vuelca el cuerpo como Markdown: "### <etiqueta>" + el texto de la respuesta
// hasta la siguiente cabecera (o "_No response_" si el campo era opcional y quedó vacío).
// Parser línea a línea (no una única regex compleja): así un campo realmente vacío entre dos
// cabeceras no puede "robarse" el título del siguiente campo como si fuera su valor.
export function parseIssueBody(body) {
  const fields = {};
  let label = null;
  let lines = [];
  const flush = () => {
    if (label === null) return;
    const value = lines.join('\n').trim();
    fields[label] = value === '_No response_' ? '' : value;
  };
  for (const line of (body || '').split(/\r?\n/)) {
    const m = /^### (.+)$/.exec(line);
    if (m) {
      flush();
      label = m[1].trim();
      lines = [];
    } else if (label !== null) {
      lines.push(line);
    }
  }
  flush();
  return fields;
}
