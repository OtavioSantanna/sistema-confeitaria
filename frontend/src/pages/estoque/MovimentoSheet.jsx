import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Sheet } from '../../components/Sheet.jsx';
import { Campo, InputNumero } from '../../components/Campos.jsx';
import { Carregando } from '../../components/Estados.jsx';
import { useToast } from '../../components/Toast.jsx';
import { estoque, ingredientes } from '../../api/index.js';
import { unidadesCompativeis, useUnidades } from '../../hooks/useReferencias.js';
import { decimalValido, parseDecimal, qtd } from '../../lib/format.js';

const MOTIVOS_BAIXA = [
  { tipo: 'saida', rotulo: 'Usei' },
  { tipo: 'perda', rotulo: 'Perdi / estragou' },
];

// Entrada (+) ou baixa (−) de um ingrediente, em 2 passos: informar e confirmar.
export function MovimentoSheet({ ingrediente, operacao, onFechar, onFeito }) {
  const toast = useToast();
  const unidades = useUnidades();
  const [detalhe, setDetalhe] = useState(null);
  const [quantidade, setQuantidade] = useState('');
  const [unidadeId, setUnidadeId] = useState('');
  const [tipo, setTipo] = useState('saida');
  const [custo, setCusto] = useState('');
  const [observacao, setObservacao] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const aberto = Boolean(ingrediente);
  const entrada = operacao === 'entrada';

  useEffect(() => {
    if (!ingrediente) return;
    setDetalhe(null); setQuantidade(''); setCusto(''); setObservacao(''); setTipo('saida'); setConfirmando(false);
    setUnidadeId(ingrediente.unidadeEstoqueId);
    ingredientes.buscar(ingrediente.id).then(setDetalhe).catch(toast.erro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingrediente]);

  const u = unidades?.find((x) => x.id === Number(unidadeId));
  const uEstoque = detalhe?.unidadeEstoque;
  // Quantidade convertida para a unidade de estoque (para a prévia).
  const fator = (() => {
    if (!detalhe || !u) return null;
    const conv = detalhe.conversoes.find((c) => c.unidadeId === u.id);
    if (conv) return Number(conv.quantidade);
    const ue = unidades.find((x) => x.id === detalhe.unidadeEstoqueId);
    return ue && ue.grandeza === u.grandeza ? Number(u.fatorBase) / Number(ue.fatorBase) : null;
  })();
  const convertida = decimalValido(quantidade) && fator ? Number(parseDecimal(quantidade)) * fator : null;
  const atual = Number(detalhe?.estoqueFisico ?? 0);
  const depois = convertida == null ? null : entrada ? atual + convertida : atual - convertida;

  async function salvar() {
    setSalvando(true);
    try {
      await estoque.movimentar({
        ingredienteId: ingrediente.id,
        tipo: entrada ? 'entrada' : tipo,
        quantidade: parseDecimal(quantidade),
        unidadeId: Number(unidadeId),
        ...(entrada && custo ? { custoTotal: parseDecimal(custo) } : {}),
        observacao: observacao.trim() || null,
      });
      toast.ok(entrada ? `Entrada de ${qtd(convertida, uEstoque)} registrada` : `Baixa de ${qtd(convertida, uEstoque)} registrada`);
      onFeito();
    } catch (e) {
      toast.erro(e);
    } finally {
      setSalvando(false);
    }
  }

  const titulo = `${entrada ? 'Adicionar' : 'Dar baixa'} · ${ingrediente?.nome ?? ''}`;

  return (
    <Sheet
      aberto={aberto}
      onFechar={onFechar}
      titulo={confirmando ? 'Confirmar' : titulo}
      rodape={detalhe && (confirmando ? (
        <>
          <button type="button" className="btn btn-contorno" onClick={() => setConfirmando(false)} disabled={salvando}>Voltar</button>
          <button type="button" className={`btn ${entrada ? 'btn-primario' : 'btn-escuro'}`} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Confirmar'}
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-primario" disabled={convertida == null} onClick={() => setConfirmando(true)}>
          Continuar
        </button>
      ))}
    >
      {!detalhe ? (
        <Carregando />
      ) : confirmando ? (
        <div className="form">
          <p style={{ fontSize: '1.1rem' }}>
            {entrada ? 'Adicionar' : tipo === 'perda' ? 'Registrar perda de' : 'Dar baixa de'}{' '}
            <b>{qtd(parseDecimal(quantidade), u?.codigo)}</b>
            {u?.id !== detalhe.unidadeEstoqueId && <> ({qtd(convertida, uEstoque)})</>} de <b>{detalhe.nome}</b>?
          </p>
          <div className="card linha" style={{ justifyContent: 'center', gap: 16 }}>
            <div className="direita"><p className="suave mini">Estoque agora</p><p className="negrito">{qtd(atual, uEstoque)}</p></div>
            <ArrowRight color="var(--texto-suave)" />
            <div><p className="suave mini">Depois</p><p className="negrito" style={{ color: depois < 0 ? 'var(--falta)' : 'var(--vinho)' }}>{qtd(depois, uEstoque)}</p></div>
          </div>
          {!entrada && depois < 0 && (
            <div className="aviso-box">A baixa é maior que o estoque registrado; o saldo ficará negativo.</div>
          )}
        </div>
      ) : (
        <div className="form">
          <p className="suave">Em estoque: <b>{qtd(atual, uEstoque)}</b></p>
          {!entrada && (
            <div className="campo">
              <span>Motivo</span>
              <div className="opcoes">
                {MOTIVOS_BAIXA.map((m) => (
                  <button key={m.tipo} type="button" className={`opcao ${tipo === m.tipo ? 'ativo' : ''}`} onClick={() => setTipo(m.tipo)}>
                    {m.rotulo}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="campo">
            <span>Quantidade</span>
            <div className="grade-qtd">
              <InputNumero value={quantidade} onChange={setQuantidade} autoFocus placeholder="0" aria-label="Quantidade" />
              <select className="select" value={unidadeId} onChange={(e) => setUnidadeId(Number(e.target.value))} aria-label="Unidade">
                {unidadesCompativeis(unidades, detalhe).map((x) => <option key={x.id} value={x.id}>{x.codigo}</option>)}
              </select>
            </div>
            {convertida != null && u?.id !== detalhe.unidadeEstoqueId && <small>= {qtd(convertida, uEstoque)}</small>}
          </div>
          {entrada && (
            <Campo rotulo="Valor pago (opcional)">
              <InputNumero value={custo} onChange={setCusto} placeholder="R$ 0,00" />
            </Campo>
          )}
          <Campo rotulo="Observação (opcional)">
            <input className="input" value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={300} />
          </Campo>
        </div>
      )}
    </Sheet>
  );
}
