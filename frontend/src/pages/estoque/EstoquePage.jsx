import { useMemo, useState } from 'react';
import { AlertTriangle, Minus, Package, Pencil, Plus, Search } from 'lucide-react';
import { Pagina } from '../../components/Layout.jsx';
import { Carregando, Erro, Vazio } from '../../components/Estados.jsx';
import { Sheet } from '../../components/Sheet.jsx';
import { useToast } from '../../components/Toast.jsx';
import { estoque, ingredientes } from '../../api/index.js';
import { useCarregar } from '../../hooks/useCarregar.js';
import { dataHora, normalizar, qtd } from '../../lib/format.js';
import { IngredientePickerSheet } from '../receitas/IngredientePickerSheet.jsx';
import { IngredienteFormSheet } from './IngredienteFormSheet.jsx';
import { MovimentoSheet } from './MovimentoSheet.jsx';

const TIPOS_MOV = { entrada: 'Entrada', saida: 'Uso', producao: 'Produção', perda: 'Perda', ajuste: 'Ajuste' };

function DetalheSheet({ ingrediente, onFechar, onEditar }) {
  const { dados } = useCarregar(
    () => (ingrediente ? estoque.movimentacoes({ ingredienteId: ingrediente.id, limite: 30 }) : Promise.resolve(null)),
    [ingrediente],
  );
  return (
    <Sheet aberto={Boolean(ingrediente)} onFechar={onFechar} titulo={ingrediente?.nome} alta
      rodape={<button type="button" className="btn btn-contorno" onClick={onEditar}><Pencil size={18} /> Editar ingrediente</button>}>
      {ingrediente && (
        <>
          <div className="grade-2" style={{ marginBottom: 16 }}>
            <div className="card"><p className="suave mini">Físico</p><p className="negrito">{qtd(ingrediente.estoqueFisico, ingrediente.unidadeEstoque)}</p></div>
            <div className="card"><p className="suave mini">Reservado p/ encomendas</p><p className="negrito">{qtd(ingrediente.estoqueReservado, ingrediente.unidadeEstoque)}</p></div>
            <div className="card"><p className="suave mini">Disponível</p><p className="negrito">{qtd(ingrediente.estoqueDisponivel, ingrediente.unidadeEstoque)}</p></div>
            <div className="card"><p className="suave mini">Mínimo</p><p className="negrito">{qtd(ingrediente.estoqueMinimo, ingrediente.unidadeEstoque)}</p></div>
          </div>
          <div className="secao-titulo"><span>Últimas movimentações</span></div>
          {!dados ? <Carregando /> : dados.length === 0 ? <p className="suave">Nenhuma movimentação.</p> : (
            <div className="card card-lista">
              {dados.map((m) => (
                <div key={m.id} className="item-linha">
                  <div className="cresce">
                    <p className="negrito">{TIPOS_MOV[m.tipo]}{m.encomendaId ? ` · encomenda #${m.encomendaId}` : ''}</p>
                    <p className="suave mini">{dataHora(m.dataMovimento)}{m.observacao ? ` · ${m.observacao}` : ''}</p>
                  </div>
                  <span className="negrito" style={{ color: Number(m.quantidade) < 0 ? 'var(--falta)' : 'var(--ok)' }}>
                    {Number(m.quantidade) > 0 ? '+' : ''}{qtd(m.quantidade, m.unidade)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}

export function EstoquePage() {
  const toast = useToast();
  const [termo, setTermo] = useState('');
  const [soMinimo, setSoMinimo] = useState(false);
  const { dados, carregando, erro, recarregar } = useCarregar(() => ingredientes.listar({ ativo: true }), []);
  const [mov, setMov] = useState({ ingrediente: null, operacao: null });
  const [escolher, setEscolher] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [editar, setEditar] = useState(null);

  const lista = useMemo(() => {
    const t = normalizar(termo);
    return (dados ?? []).filter((i) => (!t || normalizar(i.nome).includes(t)) && (!soMinimo || i.abaixoMinimo));
  }, [dados, termo, soMinimo]);
  const qtdMinimo = (dados ?? []).filter((i) => i.abaixoMinimo).length;

  const feito = () => { setMov({ ingrediente: null, operacao: null }); recarregar(); };

  async function abrirEdicao() {
    try {
      setEditar(await ingredientes.buscar(detalhe.id));
      setDetalhe(null);
    } catch (e) {
      toast.erro(e);
    }
  }

  return (
    <Pagina titulo="Estoque">
      <div className="busca" style={{ marginBottom: 10 }}>
        <Search size={18} />
        <input className="input" type="search" value={termo} onChange={(e) => setTermo(e.target.value)}
          placeholder="Filtrar estoque…" aria-label="Filtrar estoque" />
      </div>
      <div className="chips" style={{ marginBottom: 14 }}>
        <button type="button" className={`chip ${!soMinimo ? 'ativo' : ''}`} onClick={() => setSoMinimo(false)}>Todos ({dados?.length ?? 0})</button>
        <button type="button" className={`chip ${soMinimo ? 'ativo' : ''}`} onClick={() => setSoMinimo(true)}>
          Abaixo do mínimo ({qtdMinimo})
        </button>
      </div>

      {carregando && !dados && <Carregando />}
      {erro && <Erro erro={erro} onTentar={recarregar} />}
      {dados?.length === 0 && <Vazio icone={Package} titulo="Estoque vazio">Toque em “Adicionar” para registrar o primeiro item.</Vazio>}

      <div className="lista lista-grade">
        {lista.map((i) => {
          const disponivel = Number(i.estoqueDisponivel);
          const minimo = Number(i.estoqueMinimo);
          const pct = minimo > 0 ? Math.max(0, Math.min(100, (disponivel / (minimo * 2)) * 100)) : disponivel > 0 ? 100 : 0;
          return (
            <div key={i.id} className="card">
              <div className="linha">
                <button type="button" className="cresce card-clicavel" style={{ background: 'none', padding: 0 }} onClick={() => setDetalhe(i)}>
                  <p className="titulo-card truncar">{i.nome}</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 900, color: disponivel <= 0 ? 'var(--falta)' : 'var(--vinho)' }}>
                    {qtd(i.estoqueDisponivel, i.unidadeEstoque)}
                  </p>
                  <p className="suave mini">
                    {Number(i.estoqueReservado) > 0 ? `${qtd(i.estoqueReservado, i.unidadeEstoque)} reservado · ` : ''}
                    físico {qtd(i.estoqueFisico, i.unidadeEstoque)}
                  </p>
                </button>
                <div className="acoes-card">
                  <button type="button" className="btn-redondo btn-menos" aria-label={`Dar baixa em ${i.nome}`}
                    onClick={() => setMov({ ingrediente: i, operacao: 'baixa' })}><Minus size={22} /></button>
                  <button type="button" className="btn-redondo btn-mais" aria-label={`Adicionar ${i.nome}`}
                    onClick={() => setMov({ ingrediente: i, operacao: 'entrada' })}><Plus size={22} /></button>
                </div>
              </div>
              <div className="barra-estoque" aria-hidden="true">
                <div style={{ width: `${pct}%`, background: i.abaixoMinimo ? '#e0a100' : undefined }} />
              </div>
              {i.abaixoMinimo && (
                <p className="mini" style={{ color: 'var(--alerta)', fontWeight: 800, marginTop: 6 }}>
                  <AlertTriangle size={13} style={{ verticalAlign: -2 }} /> Abaixo do mínimo ({qtd(i.estoqueMinimo, i.unidadeEstoque)})
                </p>
              )}
            </div>
          );
        })}
      </div>

      <button type="button" className="fab" onClick={() => setEscolher(true)}>
        <Plus size={22} /> Adicionar
      </button>

      <IngredientePickerSheet
        aberto={escolher}
        titulo="O que chegou?"
        mostrarEstoque
        onFechar={() => setEscolher(false)}
        onSelecionar={(ing) => {
          setEscolher(false);
          recarregar();
          setMov({ ingrediente: { ...ing, unidadeEstoqueId: ing.unidadeEstoqueId }, operacao: 'entrada' });
        }}
      />
      <MovimentoSheet ingrediente={mov.ingrediente} operacao={mov.operacao}
        onFechar={() => setMov({ ingrediente: null, operacao: null })} onFeito={feito} />
      <DetalheSheet ingrediente={detalhe} onFechar={() => setDetalhe(null)} onEditar={abrirEdicao} />
      <IngredienteFormSheet aberto={Boolean(editar)} ingrediente={editar} onFechar={() => setEditar(null)}
        onSalvo={() => { setEditar(null); recarregar(); }} />
    </Pagina>
  );
}
