import { useEffect, useState } from 'react';
import { Sheet } from '../../components/Sheet.jsx';
import { ListaBusca } from '../../components/ListaBusca.jsx';
import { Carregando } from '../../components/Estados.jsx';
import { useToast } from '../../components/Toast.jsx';
import { receitas } from '../../api/index.js';
import { iniciais } from '../../lib/format.js';

export function ReceitaPickerSheet({ aberto, onFechar, onSelecionar, excluir = [] }) {
  const toast = useToast();
  const [lista, setLista] = useState(null);
  useEffect(() => {
    if (aberto) receitas.listar({ ativo: true }).then(setLista).catch(toast.erro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  return (
    <Sheet aberto={aberto} onFechar={onFechar} titulo="Escolher receita" alta>
      {lista ? (
        <ListaBusca
          itens={lista.filter((r) => !excluir.includes(r.id))}
          texto={(r) => `${r.nome} ${r.tipoReceita}`}
          grupo={(r) => r.tipoReceita}
          placeholder="Buscar receita…"
          onSelecionar={onSelecionar}
          renderItem={(r) => (
            <>
              <span className="avatar">{iniciais(r.nome)}</span>
              <span className="cresce negrito">{r.nome}</span>
            </>
          )}
        />
      ) : (
        <Carregando />
      )}
    </Sheet>
  );
}
