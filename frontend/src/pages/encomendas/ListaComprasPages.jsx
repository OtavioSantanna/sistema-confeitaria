import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pagina } from '../../components/Layout.jsx';
import { Carregando, Erro } from '../../components/Estados.jsx';
import { Campo } from '../../components/Campos.jsx';
import { encomendas, listaCompras } from '../../api/index.js';
import { useCarregar } from '../../hooks/useCarregar.js';
import { hojeISO } from '../../lib/format.js';
import { ListaComprasResultado } from './ListaCompras.jsx';

// Lista de compras de UMA encomenda (a partir da tela da encomenda).
export function ListaComprasEncomendaPage() {
  const { id } = useParams();
  const { dados, carregando, erro, recarregar } = useCarregar(async () => {
    const [enc, lista] = await Promise.all([
      encomendas.buscar(id),
      listaCompras({ encomendaIds: id, incluirOrcamentos: true }),
    ]);
    return { enc, lista };
  }, [id]);

  return (
    <Pagina titulo="Lista de compras" voltar={`/encomendas/${id}`}>
      {carregando && <Carregando />}
      {erro && <Erro erro={erro} onTentar={recarregar} />}
      {dados && (
        <>
          <p className="suave" style={{ marginBottom: 12 }}>
            Encomenda #{id} · {dados.enc.cliente}
          </p>
          {dados.lista.encomendas.length === 0 ? (
            <div className="aviso-box">Esta encomenda já teve baixa no estoque (ou foi cancelada/entregue), então não entra na lista de compras.</div>
          ) : (
            <>
              {dados.lista.avisos.length > 0 && <Erro erro={{ message: 'Atenção', detalhes: dados.lista.avisos }} />}
              <ListaComprasResultado dados={dados.lista} titulo={`Compras — encomenda #${id} (${dados.enc.cliente})`} />
            </>
          )}
        </>
      )}
    </Pagina>
  );
}

const somaDias = (iso, dias) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

// Lista de compras consolidada por período de entrega.
export function ListaComprasPeriodoPage() {
  const [filtro, setFiltro] = useState({
    de: hojeISO(),
    ate: somaDias(hojeISO(), 7),
    incluirOrcamentos: false,
    considerarEstoqueMinimo: false,
  });
  const { dados, carregando, erro, recarregar } = useCarregar(() => listaCompras(filtro), [filtro]);
  const muda = (campo, valor) => setFiltro((f) => ({ ...f, [campo]: valor }));

  return (
    <Pagina titulo="Lista de compras" voltar="/encomendas">
      <div className="card form" style={{ marginBottom: 14 }}>
        <div className="grade-2">
          <Campo rotulo="Entregas de">
            <input className="input" type="date" value={filtro.de} onChange={(e) => muda('de', e.target.value)} />
          </Campo>
          <Campo rotulo="até">
            <input className="input" type="date" value={filtro.ate} min={filtro.de} onChange={(e) => muda('ate', e.target.value)} />
          </Campo>
        </div>
        <div className="chips">
          <button type="button" className={`chip ${filtro.incluirOrcamentos ? 'ativo' : ''}`}
            onClick={() => muda('incluirOrcamentos', !filtro.incluirOrcamentos)}>
            Incluir orçamentos
          </button>
          <button type="button" className={`chip ${filtro.considerarEstoqueMinimo ? 'ativo' : ''}`}
            onClick={() => muda('considerarEstoqueMinimo', !filtro.considerarEstoqueMinimo)}>
            Repor estoque mínimo
          </button>
        </div>
      </div>

      {carregando && <Carregando />}
      {erro && <Erro erro={erro} onTentar={recarregar} />}
      {dados && (
        <>
          <p className="suave" style={{ marginBottom: 12 }}>
            {dados.encomendas.length === 0
              ? 'Nenhuma encomenda a produzir no período.'
              : `${dados.encomendas.length} ${dados.encomendas.length === 1 ? 'encomenda' : 'encomendas'}: ${dados.encomendas.map((e) => `#${e.id} ${e.cliente}`).join(', ')}`}
          </p>
          {dados.avisos.length > 0 && <Erro erro={{ message: 'Atenção', detalhes: dados.avisos }} />}
          {(dados.encomendas.length > 0 || filtro.considerarEstoqueMinimo) && (
            <ListaComprasResultado dados={dados} titulo={`Compras de ${filtro.de.split('-').reverse().join('/')} a ${filtro.ate.split('-').reverse().join('/')}`} />
          )}
        </>
      )}
    </Pagina>
  );
}
