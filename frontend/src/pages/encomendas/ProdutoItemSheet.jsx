import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Cake, Candy, ChevronRight, Plus } from 'lucide-react';
import { Sheet } from '../../components/Sheet.jsx';
import { ListaBusca } from '../../components/ListaBusca.jsx';
import { Campo, Stepper } from '../../components/Campos.jsx';
import { Carregando, Erro } from '../../components/Estados.jsx';
import { produtos as produtosApi } from '../../api/index.js';
import { decimalValido, dinheiro, parseDecimal } from '../../lib/format.js';
import { ProdutoFormSheet } from '../receitas/ProdutoForm.jsx';
import { ComponenteSheet } from './ComponenteSheet.jsx';

// Passo 1: escolher o produto (lista com busca).
// Passo 2: tamanho, sabores (componentes) e quantidade.
export function ProdutoItemSheet({ aberto, onFechar, itemInicial, onConfirmar }) {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState(null);
  const [produto, setProduto] = useState(null);
  const [tamanhoId, setTamanhoId] = useState(null);
  const [escolhas, setEscolhas] = useState({});
  const [quantidade, setQuantidade] = useState('1');
  const [observacoes, setObservacoes] = useState('');
  const [carregandoProduto, setCarregandoProduto] = useState(false);
  const [novoProduto, setNovoProduto] = useState(null); // nome sugerido ao cadastrar produto
  const [compAberto, setCompAberto] = useState(null); // componente sendo escolhido no modal

  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    setNovoProduto(null);
    setCompAberto(null);
    produtosApi.listar({ ativo: true }).then(setLista).catch(setErro);
    if (itemInicial) {
      abrirProduto(itemInicial.produtoId, itemInicial);
    } else {
      setProduto(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  async function abrirProduto(id, inicial) {
    setCarregandoProduto(true);
    try {
      const p = await produtosApi.buscar(id);
      setProduto(p);
      setTamanhoId(inicial?.tamanhoId ?? (p.tamanhos.length === 1 ? p.tamanhos[0].tamanhoId : null));
      const padrao = {};
      for (const c of p.componentes) {
        const escolhida = inicial?.componentes.find((x) => x.componenteId === c.id)?.receitaId;
        padrao[c.id] = escolhida ?? c.opcoes.find((o) => o.padrao)?.receitaId ?? (c.opcoes.length === 1 ? c.opcoes[0].receitaId : null);
      }
      setEscolhas(padrao);
      setQuantidade(inicial?.quantidade ?? (p.modoCalculo === 'rendimento' && p.tipo === 'simples' && Number(p.componentes[0]?.quantidadePorUnidade) === 1 ? '50' : '1'));
      setObservacoes(inicial?.observacoes ?? '');
    } catch (e) {
      setErro(e);
    } finally {
      setCarregandoProduto(false);
    }
  }

  const precisaTamanho = produto?.modoCalculo === 'tamanho';
  const componentesVisiveis = produto?.componentes.filter((c) => c.opcoes.length > 1 || produto.tipo === 'personalizavel') ?? [];
  const faltando = produto
    ? [
        ...(precisaTamanho && !tamanhoId ? ['tamanho'] : []),
        ...produto.componentes.filter((c) => c.obrigatorio && !escolhas[c.id]).map((c) => c.nome.toLowerCase()),
        ...(!decimalValido(quantidade) ? ['quantidade'] : []),
      ]
    : [];

  const preco = useMemo(() => {
    if (!produto) return null;
    const base = precisaTamanho ? produto.tamanhos.find((t) => t.tamanhoId === tamanhoId)?.preco : produto.precoBase;
    if (base == null) return null;
    const adicionais = produto.componentes.reduce((s, c) => {
      const op = c.opcoes.find((o) => o.receitaId === escolhas[c.id]);
      return s + Number(op?.precoAdicional ?? 0);
    }, 0);
    return Number(base) + adicionais;
  }, [produto, tamanhoId, escolhas, precisaTamanho]);

  function confirmar() {
    const tamanho = produto.tamanhos.find((t) => t.tamanhoId === tamanhoId);
    onConfirmar({
      key: itemInicial?.key ?? crypto.randomUUID(),
      produtoId: produto.id,
      produto: produto.nome,
      modoCalculo: produto.modoCalculo,
      tamanhoId: precisaTamanho ? tamanhoId : null,
      tamanho: precisaTamanho ? tamanho?.tamanho : null,
      quantidade: parseDecimal(quantidade),
      observacoes: observacoes.trim() || null,
      precoEstimado: preco,
      componentes: produto.componentes
        .filter((c) => escolhas[c.id])
        .map((c) => ({
          componenteId: c.id,
          componente: c.nome,
          receitaId: escolhas[c.id],
          receita: c.opcoes.find((o) => o.receitaId === escolhas[c.id])?.receita,
        })),
    });
  }

  const titulo = produto ? produto.nome : 'Adicionar produto';

  return (
    <>
    <Sheet
      aberto={aberto && novoProduto === null && !compAberto}
      onFechar={onFechar}
      titulo={titulo}
      alta
      rodape={
        produto && (
          <button type="button" className="btn btn-primario" disabled={faltando.length > 0} onClick={confirmar}>
            {faltando.length > 0
              ? `Escolha ${faltando.join(', ')}`
              : `${itemInicial ? 'Salvar item' : 'Adicionar'}${preco != null ? ` · ${dinheiro(preco * Number(parseDecimal(quantidade)))}` : ''}`}
          </button>
        )
      }
    >
      {erro && <Erro erro={erro} />}

      {!produto && !carregandoProduto && (
        lista ? (
          <ListaBusca
            itens={lista}
            texto={(p) => `${p.nome} ${p.descricao ?? ''}`}
            placeholder="Buscar produto…"
            onSelecionar={(p) => abrirProduto(p.id)}
            vazio="Nenhum produto encontrado. Cadastre acima."
            acao={(termo) => (
              <button type="button" className="btn btn-contorno btn-bloco" onClick={() => setNovoProduto(termo)}>
                <Plus size={18} /> Cadastrar {termo ? `“${termo}”` : 'novo produto'}
              </button>
            )}
            renderItem={(p) => (
              <>
                <span className="avatar">{p.modoCalculo === 'tamanho' ? <Cake size={20} /> : <Candy size={20} />}</span>
                <span className="cresce">
                  <span className="negrito" style={{ display: 'block' }}>{p.nome}</span>
                  <span className="suave">
                    {p.modoCalculo === 'tamanho' ? 'Por tamanho' : `${dinheiro(p.precoBase)} / unidade`}
                    {p.tipo === 'personalizavel' ? ' · personalizável' : ''}
                  </span>
                </span>
              </>
            )}
          />
        ) : (
          <Carregando />
        )
      )}

      {carregandoProduto && <Carregando />}

      {produto && !carregandoProduto && (
        <div className="form">
          {!itemInicial && (
            <button type="button" className="btn btn-texto" style={{ justifySelf: 'start' }} onClick={() => setProduto(null)}>
              <ArrowLeft size={18} /> Trocar produto
            </button>
          )}

          {precisaTamanho && (
            <div className="campo">
              <span>Tamanho</span>
              <div className="opcoes">
                {produto.tamanhos.map((t) => (
                  <button key={t.tamanhoId} type="button" aria-pressed={tamanhoId === t.tamanhoId}
                    className={`opcao ${tamanhoId === t.tamanhoId ? 'ativo' : ''}`} onClick={() => setTamanhoId(t.tamanhoId)}>
                    {t.tamanho}
                    {t.preco != null && <small>{dinheiro(t.preco)}</small>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {componentesVisiveis.length > 0 && (
            <div className="campo">
              <span>Sabores</span>
              <div className="lista" style={{ gap: 8 }}>
                {componentesVisiveis.map((c) => {
                  const op = c.opcoes.find((o) => o.receitaId === escolhas[c.id]);
                  const pendente = c.obrigatorio && !op;
                  return (
                    <button key={c.id} type="button" className={`escolha ${pendente ? 'pendente' : ''}`} onClick={() => setCompAberto(c)}>
                      <span className="cresce">
                        <span className="rotulo" style={{ display: 'block' }}>{c.nome}{!c.obrigatorio && ' (opcional)'}</span>
                        <span className={`valor ${op ? '' : 'vazio'}`}>
                          {op ? op.receita : c.obrigatorio ? `Escolher ${c.nome.toLowerCase()}` : `Sem ${c.nome.toLowerCase()}`}
                        </span>
                        {op && Number(op.precoAdicional) > 0 && <span className="suave mini"> + {dinheiro(op.precoAdicional)}</span>}
                      </span>
                      <ChevronRight size={20} color="var(--texto-suave)" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="campo">
            <span>Quantidade</span>
            <Stepper value={quantidade} onChange={setQuantidade}
              passo={produto.modoCalculo === 'rendimento' && Number(quantidade) >= 10 ? 10 : 1} />
          </div>

          <Campo rotulo="Observação do item (opcional)">
            <input className="input" value={observacoes} onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex.: escrever “Parabéns, Ana!”" maxLength={500} />
          </Campo>
        </div>
      )}
    </Sheet>

    <ProdutoFormSheet
      aberto={aberto && novoProduto !== null}
      nomeInicial={novoProduto ?? ''}
      onFechar={() => setNovoProduto(null)}
      onSalvo={(p) => {
        setNovoProduto(null);
        produtosApi.listar({ ativo: true }).then(setLista).catch(() => {});
        abrirProduto(p.id);
      }}
    />
    <ComponenteSheet
      produto={produto}
      componente={aberto ? compAberto : null}
      selecionada={compAberto ? escolhas[compAberto.id] : null}
      onFechar={() => setCompAberto(null)}
      onEscolher={(receitaId, atualizado) => {
        if (atualizado) setProduto(atualizado);
        setEscolhas((e) => ({ ...e, [compAberto.id]: receitaId }));
        setCompAberto(null);
      }}
    />
    </>
  );
}
