import { useEffect, useState } from 'react';
import { Layers, Plus, Trash2, Wheat } from 'lucide-react';
import { Campo, InputNumero } from '../../components/Campos.jsx';
import { Sheet } from '../../components/Sheet.jsx';
import { Carregando, Erro } from '../../components/Estados.jsx';
import { useToast } from '../../components/Toast.jsx';
import { ingredientes as ingredientesApi, receitas } from '../../api/index.js';
import { unidadesCompativeis, useTamanhos, useTiposReceita, useUnidades } from '../../hooks/useReferencias.js';
import { decimalValido, normalizar, parseDecimal } from '../../lib/format.js';
import { IngredientePickerSheet } from './IngredientePickerSheet.jsx';
import { ReceitaPickerSheet } from './ReceitaPickerSheet.jsx';

// Tipos em que o fator por tamanho de bolo faz sentido.
const TIPOS_COM_TAMANHO = ['massa', 'recheio', 'cobertura', 'bolo', 'torta'];

// Formulário de receita — usado na página de receita e dentro de modais
// (ex.: "Cadastrar nova cobertura" ao montar uma encomenda).
//   receitaId:  edição (omitido = nova)
//   tipoInicial: nome do tipo sugerido para receita nova (ex.: "Cobertura")
//   onSalvo(receita): chamado após salvar
//   emSheet: ajusta o rodapé para dentro de um modal
export function ReceitaForm({ receitaId, tipoInicial, nomeInicial = '', onSalvo, emSheet = false }) {
  const editando = Boolean(receitaId);
  const toast = useToast();
  const unidades = useUnidades();
  const tipos = useTiposReceita();
  const tamanhos = useTamanhos();

  const [carregando, setCarregando] = useState(editando);
  const [erro, setErro] = useState(null);
  const [f, setF] = useState({ nome: nomeInicial, tipoReceitaId: '', rendimentoQuantidade: '1', rendimentoUnidadeId: '', modoPreparo: '' });
  const [itens, setItens] = useState([]);
  const [partes, setPartes] = useState([]);
  const [fatores, setFatores] = useState({});
  const [pickerIng, setPickerIng] = useState(false);
  const [pickerParte, setPickerParte] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Padrões para receita nova: unidade "un" e tipo sugerido.
  useEffect(() => {
    if (editando) return;
    if (unidades && !f.rendimentoUnidadeId) {
      setF((x) => ({ ...x, rendimentoUnidadeId: unidades.find((u) => u.codigo === 'un')?.id ?? '' }));
    }
    if (tipos && tipoInicial && !f.tipoReceitaId) {
      const t = tipos.find((x) => normalizar(x.nome) === normalizar(tipoInicial));
      if (t) setF((x) => ({ ...x, tipoReceitaId: t.id }));
    }
  }, [unidades, tipos, tipoInicial, editando, f.rendimentoUnidadeId, f.tipoReceitaId]);

  useEffect(() => {
    if (!editando) return;
    (async () => {
      try {
        const r = await receitas.buscar(receitaId);
        setF({
          nome: r.nome, tipoReceitaId: r.tipoReceitaId, rendimentoQuantidade: String(Number(r.rendimentoQuantidade)),
          rendimentoUnidadeId: r.rendimentoUnidadeId, modoPreparo: r.modoPreparo ?? '',
        });
        const detalhes = await Promise.all(r.ingredientes.map((i) => ingredientesApi.buscar(i.ingredienteId)));
        setItens(r.ingredientes.map((i, idx) => ({
          key: String(i.ingredienteId), ingrediente: detalhes[idx], quantidade: String(Number(i.quantidade)), unidadeId: i.unidadeId,
        })));
        setPartes(r.partes.map((p) => ({ subreceitaId: p.subreceitaId, receita: p.receita, tipo: p.tipoReceita, quantidade: String(Number(p.quantidade)) })));
        setFatores(Object.fromEntries(r.fatores.map((x) => [x.tamanhoId, String(Number(x.fator))])));
      } catch (e) {
        setErro(e);
      } finally {
        setCarregando(false);
      }
    })();
  }, [receitaId, editando]);

  const muda = (campo) => (e) => setF((x) => ({ ...x, [campo]: e?.target ? e.target.value : e }));
  const tipoNome = tipos?.find((t) => t.id === Number(f.tipoReceitaId))?.nome ?? '';
  const mostrarFatores =
    TIPOS_COM_TAMANHO.includes(normalizar(tipoNome)) || partes.length > 0 || Object.values(fatores).some(Boolean);

  async function adicionarIngrediente(ing) {
    setPickerIng(false);
    try {
      const det = ing.conversoes ? ing : await ingredientesApi.buscar(ing.id);
      setItens((l) => [...l, { key: String(det.id), ingrediente: det, quantidade: '', unidadeId: det.unidadeEstoqueId }]);
    } catch (e) {
      toast.erro(e);
    }
  }
  const mudaItem = (key, campo, valor) => setItens((l) => l.map((i) => (i.key === key ? { ...i, [campo]: valor } : i)));

  const valido =
    f.nome.trim() && f.tipoReceitaId && decimalValido(f.rendimentoQuantidade) && f.rendimentoUnidadeId &&
    itens.length + partes.length > 0 &&
    itens.every((i) => decimalValido(i.quantidade) && i.unidadeId) &&
    partes.every((p) => decimalValido(p.quantidade)) &&
    Object.values(fatores).every((v) => !v || decimalValido(v));

  async function salvar() {
    setSalvando(true);
    const body = {
      nome: f.nome.trim(),
      tipoReceitaId: Number(f.tipoReceitaId),
      rendimentoQuantidade: parseDecimal(f.rendimentoQuantidade),
      rendimentoUnidadeId: Number(f.rendimentoUnidadeId),
      modoPreparo: f.modoPreparo.trim() || null,
      ingredientes: itens.map((i, idx) => ({
        ingredienteId: i.ingrediente.id, quantidade: parseDecimal(i.quantidade), unidadeId: Number(i.unidadeId), ordem: idx + 1,
      })),
      partes: partes.map((p, idx) => ({ subreceitaId: p.subreceitaId, quantidade: parseDecimal(p.quantidade), ordem: idx + 1 })),
      fatores: Object.entries(fatores).filter(([, v]) => v).map(([tamanhoId, fator]) => ({ tamanhoId: Number(tamanhoId), fator: parseDecimal(fator) })),
    };
    try {
      const r = editando ? await receitas.atualizar(receitaId, body) : await receitas.criar(body);
      toast.ok(editando ? 'Receita atualizada' : 'Receita cadastrada');
      onSalvo?.(r);
    } catch (e) {
      toast.erro(e);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <Carregando />;
  if (erro) return <Erro erro={erro} />;

  const faltando = !f.nome.trim() ? 'nome' : !f.tipoReceitaId ? 'tipo' : itens.length + partes.length === 0 ? 'ingredientes ou partes' : null;

  return (
    <>
      <div className="form">
        <Campo rotulo="Nome da receita">
          <input className="input" value={f.nome} onChange={muda('nome')} placeholder="Ex.: Bolo Marta Rocha" />
        </Campo>
        <Campo rotulo="Tipo">
          <select className="select" value={f.tipoReceitaId} onChange={muda('tipoReceitaId')}>
            <option value="">Escolha…</option>
            {tipos?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </Campo>
        <div className="campo">
          <span>Rendimento</span>
          <div className="grade-qtd">
            <InputNumero value={f.rendimentoQuantidade} onChange={muda('rendimentoQuantidade')} aria-label="Quantidade de rendimento" />
            <select className="select" value={f.rendimentoUnidadeId} onChange={muda('rendimentoUnidadeId')} aria-label="Unidade de rendimento">
              {unidades?.map((u) => <option key={u.id} value={u.id}>{u.codigo}</option>)}
            </select>
          </div>
          <small>Ex.: brigadeiro rende 100 un. Para bolo, massa ou recheio, use 1 un (a receita da forma de referência).</small>
        </div>
      </div>

      <section className="secao">
        <div className="secao-titulo">
          <span>Partes (receitas prontas)</span>
          <button type="button" className="btn btn-sm btn-contorno" onClick={() => setPickerParte(true)}>
            <Plus size={16} /> Receita
          </button>
        </div>
        {partes.length === 0 ? (
          <p className="suave mini" style={{ marginTop: -4 }}>
            Para uma receita inteira, como o bolo Marta Rocha: adicione aqui o pão de ló, os recheios, a cobertura…
          </p>
        ) : (
          <div className="card card-lista">
            {partes.map((p) => (
              <div key={p.subreceitaId} className="item-linha">
                <span className="avatar" style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--rosa-claro)', color: 'var(--vinho)' }}>
                  <Layers size={18} />
                </span>
                <div className="cresce">
                  <p className="negrito truncar">{p.receita}</p>
                  {p.tipo && <p className="suave mini">{p.tipo}</p>}
                </div>
                <div style={{ width: 82 }}>
                  <InputNumero value={p.quantidade} aria-label={`Quantas vezes ${p.receita}`}
                    onChange={(v) => setPartes((l) => l.map((x) => (x.subreceitaId === p.subreceitaId ? { ...x, quantidade: v } : x)))} />
                </div>
                <span className="suave">×</span>
                <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} aria-label={`Remover ${p.receita}`}
                  onClick={() => setPartes((l) => l.filter((x) => x.subreceitaId !== p.subreceitaId))}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            <p className="suave mini" style={{ padding: '8px 14px 12px' }}>1 = a receita inteira; 0,5 = meia receita.</p>
          </div>
        )}
      </section>

      <section className="secao">
        <div className="secao-titulo">
          <span>{partes.length ? 'Ingredientes extras' : 'Ingredientes'}</span>
          <button type="button" className="btn btn-sm btn-primario" onClick={() => setPickerIng(true)}>
            <Plus size={18} /> Ingrediente
          </button>
        </div>
        {itens.length === 0 ? (
          partes.length === 0 && (
            <button type="button" className="card card-clicavel vazio" style={{ padding: 28 }} onClick={() => setPickerIng(true)}>
              <Wheat size={40} strokeWidth={1.5} />
              <p className="titulo-card">Nenhum ingrediente</p>
              <p>Toque para escolher ou cadastrar ingredientes.</p>
            </button>
          )
        ) : (
          <div className="card card-lista">
            {itens.map((i) => (
              <div key={i.key} className="ingrediente-edicao">
                <span className="negrito nome-ing truncar">{i.ingrediente.nome}</span>
                <InputNumero value={i.quantidade} placeholder="Qtd" aria-label={`Quantidade de ${i.ingrediente.nome}`}
                  onChange={(v) => mudaItem(i.key, 'quantidade', v)} />
                <select className="select" value={i.unidadeId} aria-label={`Unidade de ${i.ingrediente.nome}`}
                  onChange={(e) => mudaItem(i.key, 'unidadeId', Number(e.target.value))}>
                  {unidadesCompativeis(unidades, i.ingrediente).map((u) => <option key={u.id} value={u.id}>{u.codigo}</option>)}
                </select>
                <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} aria-label={`Remover ${i.ingrediente.nome}`}
                  onClick={() => setItens(itens.filter((x) => x.key !== i.key))}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {mostrarFatores && tamanhos && (
        <section className="secao">
          <div className="secao-titulo"><span>Fator por tamanho de bolo</span></div>
          <div className="card form">
            <p className="suave">
              Quantas vezes esta receita é usada em cada tamanho (1 = a receita inteira; 2,3 = mais que o dobro).
              Deixe vazio os tamanhos que não se aplicam.
            </p>
            <div className="grade-2">
              {tamanhos.map((t) => (
                <Campo key={t.id} rotulo={t.nome}>
                  <InputNumero value={fatores[t.id] ?? ''} placeholder="—"
                    onChange={(v) => setFatores((x) => ({ ...x, [t.id]: v }))} />
                </Campo>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="secao">
        <Campo rotulo="Modo de preparo (opcional)">
          <textarea className="textarea" rows={4} value={f.modoPreparo} onChange={muda('modoPreparo')} />
        </Campo>
      </section>

      <div className={`rodape-acoes ${emSheet ? 'rodape-sheet' : ''}`}>
        <button type="button" className="btn btn-primario" disabled={!valido || salvando} onClick={salvar}>
          {salvando ? 'Salvando…' : faltando ? `Falta: ${faltando}` : 'Salvar receita'}
        </button>
      </div>

      <IngredientePickerSheet
        aberto={pickerIng}
        onFechar={() => setPickerIng(false)}
        onSelecionar={adicionarIngrediente}
        excluir={itens.map((i) => i.ingrediente.id)}
      />
      <ReceitaPickerSheet
        aberto={pickerParte}
        onFechar={() => setPickerParte(false)}
        excluir={[...(receitaId ? [Number(receitaId)] : []), ...partes.map((p) => p.subreceitaId)]}
        onSelecionar={(r) => {
          setPartes((l) => [...l, { subreceitaId: r.id, receita: r.nome, tipo: r.tipoReceita, quantidade: '1' }]);
          setPickerParte(false);
        }}
      />
    </>
  );
}

// Formulário de receita dentro de um modal.
export function ReceitaFormSheet({ aberto, onFechar, titulo = 'Nova receita', ...props }) {
  return (
    <Sheet aberto={aberto} onFechar={onFechar} titulo={titulo} alta>
      {aberto && <ReceitaForm emSheet {...props} />}
    </Sheet>
  );
}
