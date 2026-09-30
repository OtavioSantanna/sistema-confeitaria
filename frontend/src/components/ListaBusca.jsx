import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { normalizar } from '../lib/format.js';

// Lista navegável com campo de busca (sem acento, sem maiúsculas).
//   itens:      array
//   texto:      item -> string usada na busca
//   grupo:      item -> nome do grupo (opcional)
//   renderItem: item -> conteúdo do botão
//   acao:       elemento extra (ex.: botão "Cadastrar novo") — recebe o termo buscado
export function ListaBusca({ itens, texto, grupo, renderItem, onSelecionar, placeholder = 'Buscar…', acao, vazio, autoFocus = true }) {
  const [termo, setTermo] = useState('');

  const filtrados = useMemo(() => {
    const t = normalizar(termo.trim());
    return t ? itens.filter((i) => normalizar(texto(i)).includes(t)) : itens;
  }, [itens, termo, texto]);

  const grupos = useMemo(() => {
    if (!grupo) return [[null, filtrados]];
    const m = new Map();
    for (const i of filtrados) {
      const g = grupo(i);
      if (!m.has(g)) m.set(g, []);
      m.get(g).push(i);
    }
    return [...m.entries()];
  }, [filtrados, grupo]);

  return (
    <div>
      <div className="busca">
        <Search size={18} />
        <input
          className="input"
          type="search"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label={placeholder}
        />
      </div>
      {acao && <div style={{ marginTop: 10 }}>{acao(termo.trim())}</div>}
      <div className="lista-busca">
        {grupos.map(([g, lista]) => (
          <div key={g ?? 'todos'}>
            {g && <div className="grupo-busca">{g}</div>}
            {lista.map((item) => (
              <button type="button" key={item.id} className="item-busca" onClick={() => onSelecionar(item)}>
                {renderItem(item)}
              </button>
            ))}
          </div>
        ))}
        {filtrados.length === 0 && (
          <p className="suave" style={{ textAlign: 'center', padding: 24 }}>
            {vazio ?? 'Nada encontrado.'}
          </p>
        )}
      </div>
    </div>
  );
}
