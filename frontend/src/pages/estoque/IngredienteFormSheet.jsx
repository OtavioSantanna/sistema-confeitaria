import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Sheet } from '../../components/Sheet.jsx';
import { Campo, InputNumero } from '../../components/Campos.jsx';
import { useToast } from '../../components/Toast.jsx';
import { ingredientes } from '../../api/index.js';
import { useUnidades } from '../../hooks/useReferencias.js';
import { decimalValido, parseDecimal } from '../../lib/format.js';

const vazio = (nome = '') => ({
  nome, unidadeEstoqueId: '', estoqueMinimo: '', embalagemQuantidade: '', embalagemDescricao: '',
  estoqueInicial: '', conversoes: [],
});

// Cadastro/edição de ingrediente. Usado no Estoque e na Receita.
export function IngredienteFormSheet({ aberto, onFechar, nomeInicial, ingrediente, onSalvo }) {
  const toast = useToast();
  const unidades = useUnidades();
  const [f, setF] = useState(vazio());
  const [salvando, setSalvando] = useState(false);
  const editando = Boolean(ingrediente);

  useEffect(() => {
    if (!aberto) return;
    if (ingrediente) {
      setF({
        nome: ingrediente.nome,
        unidadeEstoqueId: ingrediente.unidadeEstoqueId,
        estoqueMinimo: String(Number(ingrediente.estoqueMinimo)),
        embalagemQuantidade: ingrediente.embalagemQuantidade ? String(Number(ingrediente.embalagemQuantidade)) : '',
        embalagemDescricao: ingrediente.embalagemDescricao ?? '',
        estoqueInicial: '',
        conversoes: (ingrediente.conversoes ?? []).map((c) => ({ unidadeId: c.unidadeId, quantidade: String(Number(c.quantidade)) })),
      });
    } else {
      setF(vazio(nomeInicial ?? ''));
    }
  }, [aberto, ingrediente, nomeInicial]);

  const muda = (campo) => (v) => setF((x) => ({ ...x, [campo]: v?.target ? v.target.value : v }));
  const uEstoque = unidades?.find((u) => u.id === Number(f.unidadeEstoqueId));
  // Unidades de outra grandeza precisam de conversão (ex.: xícara -> g).
  const unidadesConversao = unidades?.filter((u) => u.id !== uEstoque?.id) ?? [];

  const valido =
    f.nome.trim() && f.unidadeEstoqueId &&
    (!f.embalagemQuantidade || decimalValido(f.embalagemQuantidade)) &&
    f.conversoes.every((c) => c.unidadeId && decimalValido(c.quantidade));

  async function salvar() {
    setSalvando(true);
    const body = {
      nome: f.nome.trim(),
      unidadeEstoqueId: Number(f.unidadeEstoqueId),
      estoqueMinimo: parseDecimal(f.estoqueMinimo) || '0',
      embalagemQuantidade: f.embalagemQuantidade ? parseDecimal(f.embalagemQuantidade) : null,
      embalagemDescricao: f.embalagemDescricao.trim() || null,
      conversoes: f.conversoes.map((c) => ({ unidadeId: Number(c.unidadeId), quantidade: parseDecimal(c.quantidade) })),
      ...(editando ? { ativo: ingrediente.ativo, observacoes: ingrediente.observacoes } : {}),
      ...(!editando && f.estoqueInicial ? { estoqueInicial: parseDecimal(f.estoqueInicial) } : {}),
    };
    try {
      const r = editando ? await ingredientes.atualizar(ingrediente.id, body) : await ingredientes.criar(body);
      toast.ok(editando ? 'Ingrediente atualizado' : 'Ingrediente cadastrado');
      onSalvo(r);
    } catch (e) {
      toast.erro(e);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Sheet
      aberto={aberto}
      onFechar={onFechar}
      titulo={editando ? 'Editar ingrediente' : 'Novo ingrediente'}
      alta
      rodape={
        <>
          <button type="button" className="btn btn-contorno" onClick={onFechar}>Cancelar</button>
          <button type="button" className="btn btn-primario" disabled={!valido || salvando} onClick={salvar}>
            {salvando ? 'Salvando…' : editando ? 'Salvar' : 'Cadastrar'}
          </button>
        </>
      }
    >
      <div className="form">
        <Campo rotulo="Nome">
          <input className="input" value={f.nome} onChange={muda('nome')} autoFocus={!editando} placeholder="Ex.: Farinha de trigo" />
        </Campo>

        <Campo rotulo="Controlar estoque em" dica={editando ? 'Não pode ser trocada depois que houver movimentações.' : 'Dica: use g, ml ou un.'}>
          <select className="select" value={f.unidadeEstoqueId} onChange={muda('unidadeEstoqueId')}>
            <option value="">Escolha…</option>
            {unidades?.filter((u) => ['g', 'ml', 'un', 'kg', 'l'].includes(u.codigo)).map((u) => (
              <option key={u.id} value={u.id}>{u.nome} ({u.codigo})</option>
            ))}
          </select>
        </Campo>

        <div className="grade-2">
          <Campo rotulo={`Estoque mínimo${uEstoque ? ` (${uEstoque.codigo})` : ''}`}>
            <InputNumero value={f.estoqueMinimo} onChange={muda('estoqueMinimo')} placeholder="0" />
          </Campo>
          {!editando && (
            <Campo rotulo={`Já tenho${uEstoque ? ` (${uEstoque.codigo})` : ''}`}>
              <InputNumero value={f.estoqueInicial} onChange={muda('estoqueInicial')} placeholder="0" />
            </Campo>
          )}
        </div>

        <div className="grade-2">
          <Campo rotulo={`Embalagem${uEstoque ? ` (${uEstoque.codigo})` : ''}`} dica="Para arredondar a compra">
            <InputNumero value={f.embalagemQuantidade} onChange={muda('embalagemQuantidade')} placeholder="Ex.: 395" />
          </Campo>
          <Campo rotulo="Descrição">
            <input className="input" value={f.embalagemDescricao} onChange={muda('embalagemDescricao')} placeholder="Ex.: lata 395 g" />
          </Campo>
        </div>

        <div className="campo">
          <span>Medidas caseiras (opcional)</span>
          <small>Ex.: 1 xícara de farinha = 120 g; 1 lata = 395 g. Permite usar essas medidas nas receitas.</small>
          {f.conversoes.map((c, idx) => (
            <div key={idx} className="linha" style={{ gap: 8 }}>
              <span className="suave">1</span>
              <select className="select" style={{ flex: 1.2 }} value={c.unidadeId} aria-label="Medida"
                onChange={(e) => setF((x) => ({ ...x, conversoes: x.conversoes.map((y, i) => (i === idx ? { ...y, unidadeId: e.target.value } : y)) }))}>
                <option value="">Medida…</option>
                {unidadesConversao.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
              <span className="suave">=</span>
              <div style={{ flex: 1 }}>
                <InputNumero value={c.quantidade} aria-label="Quantidade" placeholder={uEstoque?.codigo ?? ''}
                  onChange={(v) => setF((x) => ({ ...x, conversoes: x.conversoes.map((y, i) => (i === idx ? { ...y, quantidade: v } : y)) }))} />
              </div>
              <span className="suave">{uEstoque?.codigo}</span>
              <button type="button" className="icon-btn" aria-label="Remover medida"
                onClick={() => setF((x) => ({ ...x, conversoes: x.conversoes.filter((_, i) => i !== idx) }))}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-sm btn-contorno" style={{ justifySelf: 'start' }} disabled={!uEstoque}
            onClick={() => setF((x) => ({ ...x, conversoes: [...x.conversoes, { unidadeId: '', quantidade: '' }] }))}>
            <Plus size={16} /> Medida
          </button>
        </div>
      </div>
    </Sheet>
  );
}
