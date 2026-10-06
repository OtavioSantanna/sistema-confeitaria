import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, Package, Plus, Trash2, User } from 'lucide-react';
import { Pagina } from '../../components/Layout.jsx';
import { Campo } from '../../components/Campos.jsx';
import { Carregando, Erro } from '../../components/Estados.jsx';
import { useToast } from '../../components/Toast.jsx';
import { encomendas } from '../../api/index.js';
import { dinheiro, num, paraInputData } from '../../lib/format.js';
import { ProdutoItemSheet } from './ProdutoItemSheet.jsx';
import { ClienteSheet } from './ClienteSheet.jsx';

export function EncomendaFormPage() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  // ?adicionar=1 (vindo de "Adicionar item") abre direto a lista de produtos.
  const [params] = useSearchParams();
  const abrirAdicionar = params.get('adicionar') === '1';

  const [carregando, setCarregando] = useState(editando);
  const [erro, setErro] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [dataEntrega, setDataEntrega] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState([]);
  const [sheetCliente, setSheetCliente] = useState(false);
  const [sheetItem, setSheetItem] = useState({ aberto: false, item: null });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!editando) return;
    encomendas
      .buscar(id)
      .then((e) => {
        if (e.status !== 'orcamento') {
          toast.info('Só orçamentos podem ser editados');
          navigate(`/encomendas/${id}`, { replace: true });
          return;
        }
        setCliente({ id: e.clienteId, nome: e.cliente, telefone: e.clienteTelefone });
        setDataEntrega(paraInputData(e.dataEntrega));
        setObservacoes(e.observacoes ?? '');
        setItens(
          e.itens.map((i) => ({
            key: String(i.id),
            produtoId: i.produtoId,
            produto: i.produto,
            modoCalculo: i.modoCalculo,
            tamanhoId: i.tamanhoId,
            tamanho: i.tamanho,
            quantidade: String(Number(i.quantidade)),
            observacoes: i.observacoes,
            precoEstimado: i.precoUnitario != null ? Number(i.precoUnitario) : null,
            componentes: i.componentes,
          })),
        );
      })
      .then(() => abrirAdicionar && setSheetItem({ aberto: true, item: null }))
      .catch(setErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const total = itens.reduce((s, i) => (i.precoEstimado != null ? s + i.precoEstimado * Number(i.quantidade) : s), 0);
  const podeSalvar = cliente && dataEntrega && itens.length > 0 && !salvando;

  function salvarItem(item) {
    setItens((lista) => {
      const i = lista.findIndex((x) => x.key === item.key);
      return i >= 0 ? lista.map((x) => (x.key === item.key ? item : x)) : [...lista, item];
    });
    setSheetItem({ aberto: false, item: null });
  }

  async function salvar() {
    setSalvando(true);
    const body = {
      clienteId: cliente.id,
      dataEntrega,
      observacoes: observacoes.trim() || null,
      itens: itens.map((i) => ({
        produtoId: i.produtoId,
        tamanhoId: i.tamanhoId,
        quantidade: i.quantidade,
        observacoes: i.observacoes,
        componentes: i.componentes.map((c) => ({ componenteId: c.componenteId, receitaId: c.receitaId })),
      })),
    };
    try {
      const e = editando ? await encomendas.atualizar(id, body) : await encomendas.criar(body);
      toast.ok(editando ? 'Encomenda atualizada' : 'Encomenda criada');
      navigate(`/encomendas/${e.id}`, { replace: true });
    } catch (e) {
      toast.erro(e);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <Pagina titulo="Editar encomenda" voltar><Carregando /></Pagina>;
  if (erro) return <Pagina titulo="Editar encomenda" voltar><Erro erro={erro} /></Pagina>;

  return (
    <Pagina titulo={editando ? `Editar encomenda #${id}` : 'Nova encomenda'} voltar={editando ? `/encomendas/${id}` : '/encomendas'}>
      <div className="form">
        <div className="campo">
          <span>Cliente</span>
          <button type="button" className="seletor" onClick={() => setSheetCliente(true)}>
            <User size={20} color="var(--texto-suave)" />
            <span className={`cresce ${cliente ? 'negrito' : 'placeholder'}`}>
              {cliente ? cliente.nome : 'Escolher cliente'}
              {cliente?.telefone && <span className="suave" style={{ display: 'block', fontWeight: 600 }}>{cliente.telefone}</span>}
            </span>
            <ChevronRight size={20} color="var(--texto-suave)" />
          </button>
        </div>

        <Campo rotulo="Data e hora da entrega">
          <input className="input" type="datetime-local" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
        </Campo>

        <Campo rotulo="Observações (opcional)">
          <textarea className="textarea" value={observacoes} onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex.: retirar às 15h, tema da festa, alergias…" maxLength={1000} />
        </Campo>
      </div>

      <section className="secao">
        <div className="secao-titulo">
          <span>Itens da encomenda</span>
          <button type="button" className="btn btn-sm btn-primario" onClick={() => setSheetItem({ aberto: true, item: null })}>
            <Plus size={18} /> Produto
          </button>
        </div>

        {itens.length === 0 ? (
          <button type="button" className="card card-clicavel vazio" style={{ padding: 28 }}
            onClick={() => setSheetItem({ aberto: true, item: null })}>
            <Package size={40} strokeWidth={1.5} />
            <p className="titulo-card">Nenhum produto ainda</p>
            <p>Toque para adicionar bolos, doces…</p>
          </button>
        ) : (
          <div className="card card-lista">
            {itens.map((i) => (
              <div key={i.key} className="item-linha">
                <span className="qtd-pill">{num(i.quantidade)}×</span>
                <button type="button" className="cresce card-clicavel" style={{ background: 'none', padding: 0 }}
                  onClick={() => setSheetItem({ aberto: true, item: i })}>
                  <span className="negrito" style={{ display: 'block' }}>
                    {i.produto}{i.tamanho ? ` · ${i.tamanho}` : ''}
                  </span>
                  {i.componentes.length > 0 && i.modoCalculo === 'tamanho' && (
                    <span className="suave" style={{ display: 'block' }}>{i.componentes.map((c) => c.receita).join(' · ')}</span>
                  )}
                  {i.observacoes && <span className="suave mini" style={{ display: 'block' }}>“{i.observacoes}”</span>}
                  {i.precoEstimado != null && (
                    <span className="suave mini">{dinheiro(i.precoEstimado)} cada · {dinheiro(i.precoEstimado * Number(i.quantidade))}</span>
                  )}
                </button>
                <button type="button" className="icon-btn" aria-label={`Remover ${i.produto}`}
                  onClick={() => setItens(itens.filter((x) => x.key !== i.key))}>
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            <div className="total" style={{ borderTop: '1px solid var(--borda)' }}>
              <span>Total estimado</span>
              <b>{dinheiro(total)}</b>
            </div>
          </div>
        )}
      </section>

      <div className="rodape-acoes">
        <button type="button" className="btn btn-primario" disabled={!podeSalvar} onClick={salvar}>
          {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Salvar encomenda'}
        </button>
      </div>

      <ClienteSheet
        aberto={sheetCliente}
        onFechar={() => setSheetCliente(false)}
        onSelecionar={(c) => { setCliente(c); setSheetCliente(false); }}
      />
      <ProdutoItemSheet
        aberto={sheetItem.aberto}
        itemInicial={sheetItem.item}
        onFechar={() => setSheetItem({ aberto: false, item: null })}
        onConfirmar={salvarItem}
      />
    </Pagina>
  );
}
