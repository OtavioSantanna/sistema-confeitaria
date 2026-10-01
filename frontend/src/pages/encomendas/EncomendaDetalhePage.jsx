import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarClock, Pencil, Phone, Plus, ShoppingCart, StickyNote, Trash2 } from 'lucide-react';
import { Pagina } from '../../components/Layout.jsx';
import { Carregando, Erro, StatusBadge } from '../../components/Estados.jsx';
import { Confirmar } from '../../components/Sheet.jsx';
import { useToast } from '../../components/Toast.jsx';
import { encomendas } from '../../api/index.js';
import { useCarregar } from '../../hooks/useCarregar.js';
import { dataHora, dinheiro, num, STATUS } from '../../lib/format.js';

// Ações de status disponíveis em cada etapa, com o que acontece no estoque.
const ACOES = {
  orcamento: [
    { para: 'confirmada', rotulo: 'Confirmar encomenda', classe: 'btn-escuro',
      explica: 'Os ingredientes serão calculados e ficarão reservados no estoque. Mudanças futuras nas receitas não alteram esta encomenda.' },
  ],
  confirmada: [
    { para: 'em_producao', rotulo: 'Iniciar produção', classe: 'btn-escuro',
      explica: 'Os ingredientes serão baixados do estoque agora.' },
    { para: 'orcamento', rotulo: 'Voltar para orçamento', classe: 'btn-contorno',
      explica: 'A reserva de ingredientes será liberada e a encomenda poderá ser editada.' },
  ],
  em_producao: [
    { para: 'pronta', rotulo: 'Marcar como pronta', classe: 'btn-escuro', explica: 'A encomenda ficará pronta para entrega.' },
  ],
  pronta: [
    { para: 'entregue', rotulo: 'Marcar como entregue', classe: 'btn-escuro', explica: 'A encomenda será finalizada.' },
  ],
  entregue: [],
  cancelada: [
    { para: 'orcamento', rotulo: 'Reabrir como orçamento', classe: 'btn-contorno', explica: 'A encomenda volta a ser um orçamento.' },
  ],
};
const CANCELAVEL = ['orcamento', 'confirmada', 'em_producao'];

export function EncomendaDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { dados: e, carregando, erro, recarregar, setDados } = useCarregar(() => encomendas.buscar(id), [id]);
  const [acao, setAcao] = useState(null);
  const [excluir, setExcluir] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [avisos, setAvisos] = useState([]);

  async function mudarStatus() {
    setOcupado(true);
    try {
      const r = await encomendas.status(id, acao.para);
      setDados(r);
      setAvisos(r.avisos ?? []);
      toast.ok(`Encomenda: ${STATUS[acao.para].rotulo.toLowerCase()}`);
      setAcao(null);
    } catch (err) {
      toast.erro(err);
    } finally {
      setOcupado(false);
    }
  }

  async function confirmarExclusao() {
    setOcupado(true);
    try {
      await encomendas.excluir(id);
      toast.ok('Encomenda excluída');
      navigate('/encomendas', { replace: true });
    } catch (err) {
      toast.erro(err);
      setOcupado(false);
    }
  }

  if (carregando && !e) return <Pagina titulo={`Encomenda #${id}`} voltar="/encomendas"><Carregando /></Pagina>;
  if (erro) return <Pagina titulo={`Encomenda #${id}`} voltar="/encomendas"><Erro erro={erro} onTentar={recarregar} /></Pagina>;

  const podeExcluir = ['orcamento', 'cancelada'].includes(e.status) && !e.estoqueBaixadoEm;
  const podeGerarLista = ['orcamento', 'confirmada'].includes(e.status);

  return (
    <Pagina
      titulo={`Encomenda #${e.id}`}
      voltar="/encomendas"
      acoes={
        <>
          {e.status === 'orcamento' && (
            <button type="button" className="icon-btn" aria-label="Editar" onClick={() => navigate(`/encomendas/${id}/editar`)}>
              <Pencil size={20} />
            </button>
          )}
          {podeExcluir && (
            <button type="button" className="icon-btn" aria-label="Excluir" onClick={() => setExcluir(true)}>
              <Trash2 size={20} />
            </button>
          )}
        </>
      }
    >
      <div className="card detalhe-topo">
        <div className="linha linha-topo">
          <h2 className="cresce" style={{ fontSize: '1.3rem', fontWeight: 900 }}>{e.cliente}</h2>
          <StatusBadge status={e.status} />
        </div>
        <p className="info"><CalendarClock size={17} /> Entrega {dataHora(e.dataEntrega)}</p>
        {e.clienteTelefone && (
          <p className="info"><Phone size={17} /> <a href={`tel:${e.clienteTelefone}`}>{e.clienteTelefone}</a></p>
        )}
        {e.observacoes && <p className="info"><StickyNote size={17} /> {e.observacoes}</p>}
      </div>

      {avisos.length > 0 && (
        <div className="aviso-box" style={{ marginTop: 12 }}>
          Atenção:
          <ul>{avisos.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      )}

      {podeGerarLista && (
        <button type="button" className="btn btn-primario btn-bloco" style={{ marginTop: 14, minHeight: 52 }}
          onClick={() => navigate(`/encomendas/${id}/lista-compras`)}>
          <ShoppingCart size={20} /> Gerar lista de compras
        </button>
      )}

      <section className="secao">
        <div className="secao-titulo">
          <span>Itens</span>
          {e.status === 'orcamento' && (
            <button type="button" className="btn btn-sm btn-primario" onClick={() => navigate(`/encomendas/${id}/editar?adicionar=1`)}>
              <Plus size={18} /> Adicionar item
            </button>
          )}
        </div>
        <div className="card card-lista">
          {e.itens.map((i) => (
            <div key={i.id} className="item-linha">
              <span className="qtd-pill">{num(i.quantidade)}×</span>
              <div className="cresce">
                <p className="negrito">{i.produto}{i.tamanho ? ` · ${i.tamanho}` : ''}</p>
                {i.modoCalculo === 'tamanho' && (
                  <p className="suave">{i.componentes.map((c) => c.receita).join(' · ')}</p>
                )}
                {i.observacoes && <p className="suave mini">“{i.observacoes}”</p>}
              </div>
              {i.precoUnitario != null && (
                <span className="negrito direita">{dinheiro(Number(i.precoUnitario) * Number(i.quantidade))}</span>
              )}
            </div>
          ))}
          <div className="total" style={{ borderTop: '1px solid var(--borda)' }}>
            <span>Total</span>
            <b>{dinheiro(e.valorTotal)}</b>
          </div>
        </div>
        {e.status === 'orcamento' && (
          <button type="button" className="btn btn-contorno btn-bloco" style={{ marginTop: 10 }}
            onClick={() => navigate(`/encomendas/${id}/editar`)}>
            <Pencil size={18} /> Editar encomenda (itens, data, cliente)
          </button>
        )}
      </section>

      {(ACOES[e.status].length > 0 || CANCELAVEL.includes(e.status)) && (
        <section className="secao">
          <div className="secao-titulo"><span>Andamento</span></div>
          <div className="acoes-status">
            {ACOES[e.status].map((a) => (
              <button key={a.para} type="button" className={`btn ${a.classe}`} onClick={() => setAcao(a)}>
                {a.rotulo}
              </button>
            ))}
            {CANCELAVEL.includes(e.status) && (
              <button type="button" className="btn btn-perigo" onClick={() => setAcao({
                para: 'cancelada', rotulo: 'Cancelar encomenda', perigo: true,
                explica: e.estoqueBaixadoEm
                  ? 'O estoque já foi baixado. Se algo puder ser reaproveitado, registre a entrada no Estoque.'
                  : 'A reserva de ingredientes será liberada.',
              })}>
                Cancelar encomenda
              </button>
            )}
          </div>
        </section>
      )}

      <section className="secao">
        <div className="secao-titulo"><span>Histórico</span></div>
        <div className="card card-lista">
          {e.historico.map((h, idx) => (
            <div key={idx} className="item-linha">
              <StatusBadge status={h.statusNovo} />
              <span className="cresce suave">{h.observacao}</span>
              <span className="suave mini">{dataHora(h.alteradoEm)}</span>
            </div>
          ))}
        </div>
      </section>

      <Confirmar
        aberto={Boolean(acao)}
        titulo={acao?.rotulo}
        textoConfirmar={acao?.rotulo}
        perigo={acao?.perigo}
        carregando={ocupado}
        onCancelar={() => setAcao(null)}
        onConfirmar={mudarStatus}
      >
        <p>{acao?.explica}</p>
      </Confirmar>

      <Confirmar
        aberto={excluir}
        titulo="Excluir encomenda?"
        textoConfirmar="Excluir"
        perigo
        carregando={ocupado}
        onCancelar={() => setExcluir(false)}
        onConfirmar={confirmarExclusao}
      >
        <p>A encomenda #{e.id} de {e.cliente} será apagada definitivamente.</p>
      </Confirmar>
    </Pagina>
  );
}
