import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, ClipboardList, Plus, ShoppingCart } from 'lucide-react';
import { Pagina } from '../../components/Layout.jsx';
import { Carregando, Erro, StatusBadge, Vazio } from '../../components/Estados.jsx';
import { encomendas } from '../../api/index.js';
import { useCarregar } from '../../hooks/useCarregar.js';
import { dataHora, dinheiro } from '../../lib/format.js';

const FILTROS = [
  { rotulo: 'Em aberto', status: 'orcamento,confirmada,em_producao,pronta' },
  { rotulo: 'Orçamentos', status: 'orcamento' },
  { rotulo: 'Confirmadas', status: 'confirmada' },
  { rotulo: 'Em produção', status: 'em_producao' },
  { rotulo: 'Prontas', status: 'pronta' },
  { rotulo: 'Entregues', status: 'entregue' },
  { rotulo: 'Canceladas', status: 'cancelada' },
  { rotulo: 'Todas', status: '' },
];

export function EncomendasPage() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState(FILTROS[0]);
  const { dados, carregando, erro, recarregar } = useCarregar(
    () => encomendas.listar({ status: filtro.status }),
    [filtro],
  );

  return (
    <Pagina
      titulo="Encomendas"
      acoes={
        <button type="button" className="icon-btn" aria-label="Lista de compras por período"
          title="Lista de compras por período" onClick={() => navigate('/lista-compras')}>
          <ShoppingCart size={22} />
        </button>
      }
    >
      <div className="chips" role="tablist" style={{ marginBottom: 14 }}>
        {FILTROS.map((f) => (
          <button key={f.rotulo} type="button" role="tab" aria-selected={f === filtro}
            className={`chip ${f === filtro ? 'ativo' : ''}`} onClick={() => setFiltro(f)}>
            {f.rotulo}
          </button>
        ))}
      </div>

      {carregando && <Carregando />}
      {erro && <Erro erro={erro} onTentar={recarregar} />}
      {dados && dados.length === 0 && (
        <Vazio icone={ClipboardList} titulo="Nenhuma encomenda aqui">
          Toque em “Nova encomenda” para começar.
        </Vazio>
      )}
      {dados && dados.length > 0 && (
        <div className="lista lista-grade">
          {dados.map((e) => (
            <button key={e.id} type="button" className="card card-clicavel" onClick={() => navigate(`/encomendas/${e.id}`)}>
              <div className="linha linha-topo">
                <div className="cresce">
                  <p className="titulo-card truncar">{e.cliente}</p>
                  <p className="info" style={{ marginTop: 4 }}>
                    <CalendarClock size={16} /> {dataHora(e.dataEntrega)}
                  </p>
                </div>
                <StatusBadge status={e.status} />
              </div>
              <div className="linha" style={{ marginTop: 10 }}>
                <span className="suave cresce">
                  #{e.id} · {e.totalItens} {e.totalItens === 1 ? 'item' : 'itens'}
                </span>
                <span className="negrito">{dinheiro(e.valorTotal)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <button type="button" className="fab" onClick={() => navigate('/encomendas/nova')}>
        <Plus size={22} /> Nova encomenda
      </button>
    </Pagina>
  );
}
