// Formatação no padrão brasileiro.

const nf = (max) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: max });
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const num = (v, casas = 2) => (v == null || v === '' ? '—' : nf(casas).format(Number(v)));
export const dinheiro = (v) => (v == null ? '—' : moeda.format(Number(v)));

// Quantidade com unidade; g/ml grandes viram kg/L para facilitar a leitura.
export function qtd(v, unidade) {
  if (v == null) return '—';
  const n = Number(v);
  if (unidade === 'g' && Math.abs(n) >= 1000) return `${nf(2).format(n / 1000)} kg`;
  if (unidade === 'ml' && Math.abs(n) >= 1000) return `${nf(2).format(n / 1000)} L`;
  const casas = unidade === 'g' || unidade === 'ml' ? 0 : 2;
  return `${nf(casas).format(n)} ${unidade ?? ''}`.trim();
}

// "1,5" -> "1.5" (a API aceita os dois, mas normalizamos).
export const parseDecimal = (v) => String(v ?? '').trim().replace(',', '.');
export const decimalValido = (v) => /^\d+(\.\d+)?$/.test(parseDecimal(v)) && Number(parseDecimal(v)) > 0;

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

// "2026-10-06 15:00:00" -> "ter, 06/10 · 15:00"
export function dataHora(s) {
  if (!s) return '—';
  const [d, t = '00:00'] = s.split(/[ T]/);
  const [a, m, dia] = d.split('-').map(Number);
  const dt = new Date(a, m - 1, dia);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const diff = Math.round((dt - hoje) / 86400000);
  const rel = diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : diff === -1 ? 'ontem' : DIAS[dt.getDay()];
  const ano = a !== hoje.getFullYear() ? `/${a}` : '';
  return `${rel}, ${String(dia).padStart(2, '0')}/${String(m).padStart(2, '0')}${ano} · ${t.slice(0, 5)}`;
}

// Para <input type="datetime-local"> e de volta.
export const paraInputData = (s) => (s ? s.replace(' ', 'T').slice(0, 16) : '');
export const hojeISO = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const STATUS = {
  orcamento: { rotulo: 'Orçamento', cor: '#807055', fundo: '#efe9e0' },
  confirmada: { rotulo: 'Confirmada', cor: '#870040', fundo: '#f8bad6' },
  em_producao: { rotulo: 'Em produção', cor: '#8a5a00', fundo: '#fff0c7' },
  pronta: { rotulo: 'Pronta', cor: '#2e7d4f', fundo: '#e3f4ea' },
  entregue: { rotulo: 'Entregue', cor: '#3a2430', fundo: '#ece6ea' },
  cancelada: { rotulo: 'Cancelada', cor: '#b3261e', fundo: '#fde7e5' },
};

const CONECTIVOS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'com', 'em']);
export const iniciais = (nome = '') =>
  nome.split(/\s+/).filter((p) => p && !CONECTIVOS.has(p.toLowerCase()) && /\p{L}/u.test(p[0]))
    .slice(0, 2).map((p) => p[0]).join('').toUpperCase();

// Busca sem acento e sem maiúsculas.
export const normalizar = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
