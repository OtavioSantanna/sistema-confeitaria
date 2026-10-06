import { useEffect, useState } from 'react';
import { Plus, Star, Trash2, X } from 'lucide-react';
import { Campo, InputNumero } from '../../components/Campos.jsx';
import { Sheet } from '../../components/Sheet.jsx';
import { Carregando, Erro } from '../../components/Estados.jsx';
import { useToast } from '../../components/Toast.jsx';
import { produtos } from '../../api/index.js';
import { useTamanhos } from '../../hooks/useReferencias.js';
import { decimalValido, parseDecimal } from '../../lib/format.js';
import { ReceitaPickerSheet } from './ReceitaPickerSheet.jsx';

const novoComponente = (nome = '') => ({ key: crypto.randomUUID(), id: undefined, nome, obrigatorio: true, quantidadePorUnidade: '1', opcoes: [] });
const BOLO = ['Massa', 'Recheio', 'Cobertura'];
const txt = (v) => (v == null ? '' : String(Number(v)));

// Formulário de produto — usado na página de produto e dentro de modais
// (ex.: "Cadastrar produto" ao montar uma encomenda).
export function ProdutoForm({ produtoId: id, nomeInicial = '', onSalvo, emSheet = false }) {
  const editando = Boolean(id);
  const toast = useToast();
  const tamanhos = useTamanhos();

  const [carregando, setCarregando] = useState(editando);
  const [erro, setErro] = useState(null);
  const [f, setF] = useState({ nome: nomeInicial, descricao: '', tipo: 'personalizavel', modoCalculo: 'tamanho', precoBase: '' });
  const [precos, setPrecos] = useState({}); // tamanhoId -> preço ('' = oferece sem preço); ausente = não oferece
  const [componentes, setComponentes] = useState(BOLO.map((n) => novoComponente(n)));
  const [picker, setPicker] = useState(null); // key do componente
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!editando) return;
    produtos
      .buscar(id)
      .then((p) => {
        setF({ nome: p.nome, descricao: p.descricao ?? '', tipo: p.tipo, modoCalculo: p.modoCalculo, precoBase: txt(p.precoBase) });
        setPrecos(Object.fromEntries(p.tamanhos.map((t) => [t.tamanhoId, txt(t.preco)])));
        setComponentes(p.componentes.map((c) => ({
          key: String(c.id), id: c.id, nome: c.nome, obrigatorio: c.obrigatorio, quantidadePorUnidade: txt(c.quantidadePorUnidade),
          opcoes: c.opcoes.map((o) => ({ receitaId: o.receitaId, receita: o.receita, padrao: o.padrao, precoAdicional: txt(o.precoAdicional) })),
        })));
      })
      .catch(setErro)
      .finally(() => setCarregando(false));
  }, [id, editando]);

  const muda = (campo, valor) => setF((x) => ({ ...x, [campo]: valor }));
  const mudaComp = (key, campo, valor) => setComponentes((l) => l.map((c) => (c.key === key ? { ...c, [campo]: valor } : c)));
  const simples = f.tipo === 'simples';
  const porTamanho = f.modoCalculo === 'tamanho';

  function mudarTipo(tipo) {
    muda('tipo', tipo);
    if (tipo === 'simples') {
      setComponentes((l) => [{ ...(l[0] ?? novoComponente()), nome: l[0]?.nome || f.nome || 'Receita', opcoes: (l[0]?.opcoes ?? []).slice(0, 1) }]);
      if (!editando) muda('modoCalculo', 'rendimento');
    } else if (componentes.length <= 1 && !editando) {
      setComponentes(BOLO.map((n) => novoComponente(n)));
      muda('modoCalculo', 'tamanho');
    }
  }

  function adicionarOpcao(receita) {
    setComponentes((l) => l.map((c) => (c.key === picker
      ? { ...c, opcoes: [...c.opcoes, { receitaId: receita.id, receita: receita.nome, padrao: c.opcoes.length === 0, precoAdicional: '' }] }
      : c)));
    setPicker(null);
  }

  const problemas = [
    !f.nome.trim() && 'nome',
    porTamanho && Object.keys(precos).length === 0 && 'ao menos um tamanho',
    componentes.length === 0 && 'uma receita',
    componentes.some((c) => !c.nome.trim() || c.opcoes.length === 0) && 'receitas de cada parte',
    !porTamanho && f.precoBase && !decimalValido(f.precoBase) && 'preço válido',
  ].filter(Boolean);

  async function salvar() {
    setSalvando(true);
    const body = {
      nome: f.nome.trim(),
      descricao: f.descricao.trim() || null,
      tipo: f.tipo,
      modoCalculo: f.modoCalculo,
      precoBase: !porTamanho && f.precoBase ? parseDecimal(f.precoBase) : null,
      tamanhos: porTamanho ? Object.entries(precos).map(([t, p]) => ({ tamanhoId: Number(t), preco: p ? parseDecimal(p) : null })) : [],
      componentes: componentes.map((c, idx) => ({
        ...(c.id ? { id: c.id } : {}),
        nome: c.nome.trim(),
        obrigatorio: c.obrigatorio,
        quantidadePorUnidade: parseDecimal(c.quantidadePorUnidade) || '1',
        ordem: idx + 1,
        opcoes: c.opcoes.map((o) => ({ receitaId: o.receitaId, padrao: o.padrao, precoAdicional: parseDecimal(o.precoAdicional) || '0' })),
      })),
    };
    try {
      const p = editando ? await produtos.atualizar(id, body) : await produtos.criar(body);
      toast.ok(editando ? 'Produto atualizado' : 'Produto cadastrado');
      onSalvo?.(p);
    } catch (e) {
      toast.erro(e);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <Carregando />;
  if (erro) return <Erro erro={erro} />;

  const comp = picker && componentes.find((c) => c.key === picker);

  return (
    <>
      <div className="form">
        <Campo rotulo="Nome do produto">
          <input className="input" value={f.nome} onChange={(e) => muda('nome', e.target.value)} placeholder="Ex.: Bolo de aniversário" />
        </Campo>

        <div className="campo">
          <span>Tipo</span>
          <div className="segmentado" style={{ margin: 0 }}>
            <button type="button" className={!simples ? 'ativo' : ''} onClick={() => mudarTipo('personalizavel')}>Personalizável</button>
            <button type="button" className={simples ? 'ativo' : ''} onClick={() => mudarTipo('simples')}>Simples</button>
          </div>
          <small>{simples ? 'Uma receita só (ex.: brigadeiro).' : 'A cliente escolhe massa, recheio, cobertura…'}</small>
        </div>

        <div className="campo">
          <span>Como calcular</span>
          <div className="segmentado" style={{ margin: 0 }}>
            <button type="button" className={porTamanho ? 'ativo' : ''} onClick={() => muda('modoCalculo', 'tamanho')}>Por tamanho</button>
            <button type="button" className={!porTamanho ? 'ativo' : ''} onClick={() => muda('modoCalculo', 'rendimento')}>Por unidade</button>
          </div>
          <small>{porTamanho ? 'Usa o fator de cada receita para o tamanho escolhido.' : 'Usa o rendimento da receita (ex.: 300 brigadeiros ÷ 100 = 3 receitas).'}</small>
        </div>

        {!porTamanho && (
          <Campo rotulo="Preço por unidade (R$)">
            <InputNumero value={f.precoBase} onChange={(v) => muda('precoBase', v)} placeholder="0,00" />
          </Campo>
        )}
      </div>

      {porTamanho && tamanhos && (
        <section className="secao">
          <div className="secao-titulo"><span>Tamanhos e preços</span></div>
          <div className="card card-lista">
            {tamanhos.map((t) => {
              const ativo = t.id in precos;
              return (
                <div key={t.id} className="item-linha">
                  <label className="linha cresce" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={ativo} style={{ width: 20, height: 20, accentColor: 'var(--rosa)' }}
                      onChange={() => setPrecos((p) => { const n = { ...p }; if (ativo) delete n[t.id]; else n[t.id] = ''; return n; })} />
                    <span className="negrito">{t.nome}</span>
                  </label>
                  {ativo && (
                    <div style={{ width: 130 }}>
                      <InputNumero value={precos[t.id]} placeholder="R$" aria-label={`Preço ${t.nome}`}
                        onChange={(v) => setPrecos((p) => ({ ...p, [t.id]: v }))} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="secao">
        <div className="secao-titulo">
          <span>{simples ? 'Receita' : 'Partes do produto'}</span>
          {!simples && (
            <button type="button" className="btn btn-sm btn-contorno" onClick={() => setComponentes((l) => [...l, novoComponente()])}>
              <Plus size={16} /> Parte
            </button>
          )}
        </div>
        <div className="lista">
          {componentes.map((c) => (
            <div key={c.key} className="card form">
              {!simples && (
                <div className="linha">
                  <input className="input cresce" value={c.nome} placeholder="Nome da parte (ex.: Recheio)" aria-label="Nome da parte"
                    onChange={(e) => mudaComp(c.key, 'nome', e.target.value)} />
                  <button type="button" className="icon-btn" aria-label={`Remover ${c.nome}`}
                    onClick={() => setComponentes((l) => l.filter((x) => x.key !== c.key))}><Trash2 size={18} /></button>
                </div>
              )}
              {!porTamanho && (
                <Campo rotulo="Unidades da receita por item vendido" dica="Ex.: 1 para brigadeiro avulso; 25 para caixa com 25.">
                  <InputNumero value={c.quantidadePorUnidade} onChange={(v) => mudaComp(c.key, 'quantidadePorUnidade', v)} />
                </Campo>
              )}
              <div className="campo">
                <span>{simples ? 'Receita usada' : 'Opções de receita'}{!simples && c.opcoes.length > 1 && ' · ★ = padrão'}</span>
                {c.opcoes.map((o) => (
                  <div key={o.receitaId} className="linha" style={{ gap: 6 }}>
                    {!simples && (
                      <button type="button" className="icon-btn" aria-label="Marcar como padrão" aria-pressed={o.padrao}
                        onClick={() => mudaComp(c.key, 'opcoes', c.opcoes.map((x) => ({ ...x, padrao: x.receitaId === o.receitaId })))}>
                        <Star size={18} fill={o.padrao ? 'var(--rosa)' : 'none'} color={o.padrao ? 'var(--rosa)' : 'currentColor'} />
                      </button>
                    )}
                    <span className="cresce negrito">{o.receita}</span>
                    {!simples && (
                      <div style={{ width: 100 }}>
                        <InputNumero value={o.precoAdicional} placeholder="+ R$" aria-label="Preço adicional"
                          onChange={(v) => mudaComp(c.key, 'opcoes', c.opcoes.map((x) => (x.receitaId === o.receitaId ? { ...x, precoAdicional: v } : x)))} />
                      </div>
                    )}
                    <button type="button" className="icon-btn" aria-label={`Remover ${o.receita}`}
                      onClick={() => mudaComp(c.key, 'opcoes', c.opcoes.filter((x) => x.receitaId !== o.receitaId))}><X size={18} /></button>
                  </div>
                ))}
                {(!simples || c.opcoes.length === 0) && (
                  <button type="button" className="btn btn-sm btn-contorno" style={{ justifySelf: 'start' }} onClick={() => setPicker(c.key)}>
                    <Plus size={16} /> {simples ? 'Escolher receita' : 'Receita'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className={`rodape-acoes ${emSheet ? 'rodape-sheet' : ''}`}>
        <button type="button" className="btn btn-primario" disabled={problemas.length > 0 || salvando} onClick={salvar}>
          {salvando ? 'Salvando…' : problemas.length ? `Falta: ${problemas[0]}` : 'Salvar produto'}
        </button>
      </div>

      <ReceitaPickerSheet aberto={Boolean(picker)} onFechar={() => setPicker(null)} onSelecionar={adicionarOpcao}
        excluir={comp?.opcoes.map((o) => o.receitaId) ?? []} />
    </>
  );
}

// Monta o corpo do PUT a partir do produto vindo da API (para acrescentar opções).
export function produtoParaBody(p) {
  return {
    nome: p.nome,
    descricao: p.descricao,
    tipo: p.tipo,
    modoCalculo: p.modoCalculo,
    precoBase: p.precoBase,
    ativo: p.ativo,
    tamanhos: p.tamanhos.map((t) => ({ tamanhoId: t.tamanhoId, preco: t.preco })),
    componentes: p.componentes.map((c) => ({
      id: c.id,
      nome: c.nome,
      obrigatorio: c.obrigatorio,
      quantidadePorUnidade: c.quantidadePorUnidade,
      ordem: c.ordem,
      opcoes: c.opcoes.map((o) => ({ receitaId: o.receitaId, precoAdicional: o.precoAdicional, padrao: o.padrao })),
    })),
  };
}

// Formulário de produto dentro de um modal.
export function ProdutoFormSheet({ aberto, onFechar, titulo = 'Novo produto', ...props }) {
  return (
    <Sheet aberto={aberto} onFechar={onFechar} titulo={titulo} alta>
      {aberto && <ProdutoForm emSheet {...props} />}
    </Sheet>
  );
}
