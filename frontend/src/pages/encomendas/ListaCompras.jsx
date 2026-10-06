import { useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, CircleX, Share2 } from 'lucide-react';
import { useToast } from '../../components/Toast.jsx';
import { num, qtd } from '../../lib/format.js';

// Semáforo: verde = tem no estoque; amarelo = tem, mas não basta; vermelho = não tem.
export function situacao(item) {
  if (!item.precisaComprar) return 'ok';
  return Number(item.disponivelParaSelecao) > 0 ? 'alerta' : 'falta';
}

const INFO = {
  falta: { rotulo: 'Não tem', icone: CircleX, cor: 'var(--falta)', fundo: 'var(--falta-fundo)' },
  alerta: { rotulo: 'Insuficiente', icone: CircleAlert, cor: 'var(--alerta)', fundo: 'var(--alerta-fundo)' },
  ok: { rotulo: 'Tem no estoque', icone: CheckCircle2, cor: 'var(--ok)', fundo: 'var(--ok-fundo)' },
};
const ORDEM = ['falta', 'alerta', 'ok'];

function textoCompra(i) {
  if (i.embalagem?.embalagens) {
    return `${i.embalagem.embalagens} × ${i.embalagem.descricao ?? qtd(i.embalagem.quantidade, i.unidade)}`;
  }
  return qtd(i.quantidadeCompra, i.unidade);
}

export function ListaComprasResultado({ dados, titulo }) {
  const toast = useToast();
  const [filtro, setFiltro] = useState(null);

  const itens = useMemo(
    () => [...dados.itens].sort((a, b) => ORDEM.indexOf(situacao(a)) - ORDEM.indexOf(situacao(b))),
    [dados],
  );
  const contagem = Object.fromEntries(ORDEM.map((s) => [s, itens.filter((i) => situacao(i) === s).length]));
  const visiveis = filtro ? itens.filter((i) => situacao(i) === filtro) : itens;

  async function compartilhar() {
    const comprar = itens.filter((i) => i.precisaComprar);
    const texto = [
      `🛒 ${titulo ?? 'Lista de compras'}`,
      ...comprar.map((i) => `• ${i.ingrediente}: ${textoCompra(i)}`),
    ].join('\n');
    try {
      if (navigator.share) await navigator.share({ text: texto });
      else {
        await navigator.clipboard.writeText(texto);
        toast.ok('Lista copiada — cole no WhatsApp');
      }
    } catch {
      /* compartilhamento cancelado */
    }
  }

  if (itens.length === 0) {
    return <p className="suave" style={{ textAlign: 'center', padding: 32 }}>Nenhum ingrediente necessário.</p>;
  }

  return (
    <>
      <div className="legenda">
        {ORDEM.map((s) => {
          const { rotulo, icone: Icone, cor, fundo } = INFO[s];
          return (
            <button key={s} type="button" className="chip" aria-pressed={filtro === s}
              style={{ color: cor, background: fundo, borderColor: filtro === s ? cor : 'transparent' }}
              onClick={() => setFiltro(filtro === s ? null : s)}>
              <Icone size={15} style={{ verticalAlign: -2, marginRight: 4 }} />
              {rotulo} ({contagem[s]})
            </button>
          );
        })}
      </div>

      <div className="lista lista-grade">
        {visiveis.map((i) => {
          const s = situacao(i);
          const { rotulo, icone: Icone, cor, fundo } = INFO[s];
          return (
            <div key={i.ingredienteId} className={`card compra compra-${s}`}>
              <div className="linha">
                <p className="titulo-card cresce">{i.ingrediente}</p>
                <span className="badge" style={{ color: cor, background: fundo }}>
                  <Icone size={14} /> {rotulo}
                </span>
              </div>
              <div className="numeros">
                <div><span>Precisa</span><b>{qtd(i.necessario, i.unidade)}</b></div>
                <div><span>Disponível</span><b>{qtd(i.disponivelParaSelecao, i.unidade)}</b></div>
                <div style={s !== 'ok' ? { background: fundo, color: cor } : undefined}>
                  <span>Comprar</span>
                  <b>{i.precisaComprar ? textoCompra(i) : '—'}</b>
                </div>
              </div>
              {Number(i.reservadoOutrasEncomendas) > 0 && (
                <p className="suave mini" style={{ marginTop: 8 }}>
                  {qtd(i.reservadoOutrasEncomendas, i.unidade)} já reservado para outras encomendas
                  (físico: {num(i.estoqueFisico)} {i.unidade}).
                </p>
              )}
            </div>
          );
        })}
      </div>

      {contagem.falta + contagem.alerta > 0 && (
        <div className="rodape-acoes">
          <button type="button" className="btn btn-escuro" onClick={compartilhar}>
            <Share2 size={18} /> Compartilhar o que comprar
          </button>
        </div>
      )}
    </>
  );
}
