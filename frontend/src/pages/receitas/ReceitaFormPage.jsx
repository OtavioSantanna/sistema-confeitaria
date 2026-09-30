import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Wheat } from 'lucide-react';
import { Pagina } from '../../components/Layout.jsx';
import { Campo, InputNumero } from '../../components/Campos.jsx';
import { Confirmar } from '../../components/Sheet.jsx';
import { Carregando, Erro } from '../../components/Estados.jsx';
import { useToast } from '../../components/Toast.jsx';
import { ingredientes as ingredientesApi, receitas } from '../../api/index.js';
import { unidadesCompativeis, useTamanhos, useTiposReceita, useUnidades } from '../../hooks/useReferencias.js';
import { decimalValido, parseDecimal } from '../../lib/format.js';
import { IngredientePickerSheet } from './IngredientePickerSheet.jsx';

const TIPOS_BOLO = ['Massa', 'Recheio', 'Cobertura'];

export function ReceitaFormPage() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const unidades = useUnidades();
  const tipos = useTiposReceita();
  const tamanhos = useTamanhos();

  const [carregando, setCarregando] = useState(editando);
  const [erro, setErro] = useState(null);
  const [f, setF] = useState({ nome: '', tipoReceitaId: '', rendimentoQuantidade: '1', rendimentoUnidadeId: '', modoPreparo: '' });
  const [itens, setItens] = useState([]);
  const [fatores, setFatores] = useState({});
  const [picker, setPicker] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluir, setExcluir] = useState(false);

  // Unidade de rendimento padrão: "un"
  useEffect(() => {
    if (!editando && unidades && !f.rendimentoUnidadeId) {
      setF((x) => ({ ...x, rendimentoUnidadeId: unidades.find((u) => u.codigo === 'un')?.id ?? '' }));
    }
  }, [unidades, editando, f.rendimentoUnidadeId]);

  useEffect(() => {
    if (!editando) return;
    (async () => {
      try {
        const r = await receitas.buscar(id);
        setF({
          nome: r.nome, tipoReceitaId: r.tipoReceitaId, rendimentoQuantidade: String(Number(r.rendimentoQuantidade)),
          rendimentoUnidadeId: r.rendimentoUnidadeId, modoPreparo: r.modoPreparo ?? '',
        });
        const detalhes = await Promise.all(r.ingredientes.map((i) => ingredientesApi.buscar(i.ingredienteId)));
        setItens(r.ingredientes.map((i, idx) => ({
          key: String(i.ingredienteId), ingrediente: detalhes[idx], quantidade: String(Number(i.quantidade)), unidadeId: i.unidadeId,
        })));
        setFatores(Object.fromEntries(r.fatores.map((x) => [x.tamanhoId, String(Number(x.fator))])));
      } catch (e) {
        setErro(e);
      } finally {
        setCarregando(false);
      }
    })();
  }, [id, editando]);

  const muda = (campo) => (e) => setF((x) => ({ ...x, [campo]: e?.target ? e.target.value : e }));
  const tipoNome = tipos?.find((t) => t.id === Number(f.tipoReceitaId))?.nome;
  const mostrarFatores = TIPOS_BOLO.includes(tipoNome) || Object.values(fatores).some(Boolean);

  async function adicionarIngrediente(ing) {
    setPicker(false);
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
    itens.length > 0 && itens.every((i) => decimalValido(i.quantidade) && i.unidadeId) &&
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
      fatores: Object.entries(fatores).filter(([, v]) => v).map(([tamanhoId, fator]) => ({ tamanhoId: Number(tamanhoId), fator: parseDecimal(fator) })),
    };
    try {
      editando ? await receitas.atualizar(id, body) : await receitas.criar(body);
      toast.ok(editando ? 'Receita atualizada' : 'Receita cadastrada');
      navigate('/receitas', { replace: true });
    } catch (e) {
      toast.erro(e);
    } finally {
      setSalvando(false);
    }
  }

  async function desativar() {
    try {
      await receitas.desativar(id);
      toast.ok('Receita removida');
      navigate('/receitas', { replace: true });
    } catch (e) {
      toast.erro(e);
    }
  }

  const titulo = editando ? 'Editar receita' : 'Nova receita';
  if (carregando) return <Pagina titulo={titulo} voltar="/receitas"><Carregando /></Pagina>;
  if (erro) return <Pagina titulo={titulo} voltar="/receitas"><Erro erro={erro} /></Pagina>;

  return (
    <Pagina
      titulo={titulo}
      voltar="/receitas"
      acoes={editando && (
        <button type="button" className="icon-btn" aria-label="Remover receita" onClick={() => setExcluir(true)}>
          <Trash2 size={20} />
        </button>
      )}
    >
      <div className="form">
        <Campo rotulo="Nome da receita">
          <input className="input" value={f.nome} onChange={muda('nome')} placeholder="Ex.: Massa de baunilha" />
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
          <small>Ex.: brigadeiro rende 100 un. Para massa/recheio de bolo, use 1 un (a receita da forma de referência).</small>
        </div>
      </div>

      <section className="secao">
        <div className="secao-titulo">
          <span>Ingredientes</span>
          <button type="button" className="btn btn-sm btn-primario" onClick={() => setPicker(true)}>
            <Plus size={18} /> Ingrediente
          </button>
        </div>
        {itens.length === 0 ? (
          <button type="button" className="card card-clicavel vazio" style={{ padding: 28 }} onClick={() => setPicker(true)}>
            <Wheat size={40} strokeWidth={1.5} />
            <p className="titulo-card">Nenhum ingrediente</p>
            <p>Toque para escolher ou cadastrar ingredientes.</p>
          </button>
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
          <textarea className="textarea" rows={5} value={f.modoPreparo} onChange={muda('modoPreparo')} />
        </Campo>
      </section>

      <div className="rodape-acoes">
        <button type="button" className="btn btn-primario" disabled={!valido || salvando} onClick={salvar}>
          {salvando ? 'Salvando…' : 'Salvar receita'}
        </button>
      </div>

      <IngredientePickerSheet
        aberto={picker}
        onFechar={() => setPicker(false)}
        onSelecionar={adicionarIngrediente}
        excluir={itens.map((i) => i.ingrediente.id)}
      />
      <Confirmar aberto={excluir} titulo="Remover receita?" textoConfirmar="Remover" perigo
        onCancelar={() => setExcluir(false)} onConfirmar={desativar}>
        <p>A receita sai da lista. Encomendas antigas continuam com os cálculos já feitos.</p>
      </Confirmar>
    </Pagina>
  );
}
