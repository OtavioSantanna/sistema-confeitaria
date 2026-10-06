import { STATUS } from '../lib/format.js';

export const Carregando = () => (
  <div className="carregando" aria-label="Carregando">
    <div className="spinner" />
  </div>
);

export function Vazio({ icone: Icone, titulo, children }) {
  return (
    <div className="vazio">
      {Icone && <Icone size={56} strokeWidth={1.5} />}
      <p className="titulo-card">{titulo}</p>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Erro({ erro, onTentar }) {
  return (
    <div className="erro-box">
      {erro?.message ?? 'Erro ao carregar'}
      {erro?.detalhes?.length > 0 && (
        <ul>{erro.detalhes.map((d) => <li key={d}>{d}</li>)}</ul>
      )}
      {onTentar && (
        <div style={{ marginTop: 8 }}>
          <button type="button" className="btn btn-sm btn-contorno" onClick={onTentar}>Tentar de novo</button>
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status }) {
  const s = STATUS[status] ?? { rotulo: status, cor: '#555', fundo: '#eee' };
  return (
    <span className="badge" style={{ color: s.cor, background: s.fundo }}>
      {s.rotulo}
    </span>
  );
}
