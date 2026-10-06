// Converte linhas do banco (snake_case) para JSON da API (camelCase).
const camel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

export function toCamel(row) {
  if (row == null) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[camel(k)] = v;
  return out;
}

export const rowsToCamel = (rows) => rows.map(toCamel);

// MySQL devolve BOOLEAN como 0/1.
export function bools(obj, ...campos) {
  for (const c of campos) if (c in obj) obj[c] = Boolean(obj[c]);
  return obj;
}
