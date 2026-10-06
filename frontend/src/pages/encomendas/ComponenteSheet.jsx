import { useEffect, useMemo, useState } from 'react';
import { Check, CircleSlash, Plus } from 'lucide-react';
import { Sheet } from '../../components/Sheet.jsx';
import { ListaBusca } from '../../components/ListaBusca.jsx';
import { Carregando } from '../../components/Estados.jsx';
import { useToast } from '../../components/Toast.jsx';
import { produtos as produtosApi, receitas as receitasApi } from '../../api/index.js';
import { dinheiro, iniciais, normalizar } from '../../lib/format.js';
import { produtoParaBody } from '../receitas/ProdutoForm.jsx';
import { ReceitaFormSheet } from '../receitas/ReceitaForm.jsx';

const SEM = { id: 'sem' };

// Modal para escolher a receita de um componente do bolo (massa, recheio,
// cobertura…). Mostra as opções do produto, as outras receitas cadastradas
// e permite cadastrar uma receita nova. Escolher uma receita que ainda não
// é opção do produto a acrescenta ao produto (vale para as próximas encomendas).
//   onEscolher(receitaId | null, produtoAtualizado?)
export function ComponenteSheet({ produto, componente, selecionada, onFechar, onEscolher }) {
  const toast = useToast();
  const [todas, setTodas] = useState(null);
  const [nova, setNova] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [corrigir, setCorrigir] = useState(null); // receita sem fator p/ os tamanhos do produto
  const aberto = Boolean(componente);
  const nome = componente?.nome ?? '';
  const nomeMin = nome.toLowerCase();

  useEffect(() => {
    if (!aberto) return;
    setNova(false);
    setCorrigir(null);
    receitasApi.listar({ ativo: true }).then(setTodas).catch(toast.erro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const itens = useMemo(() => {
    if (!componente || !todas) return [];
    const opcoes = new Map(componente.opcoes.map((o) => [o.receitaId, o]));
    const lista = todas.map((r) => ({ ...r, opcao: opcoes.get(r.id) }));
    // Opções do produto primeiro; depois receitas do mesmo tipo (ex.: "Cobertura"); depois o resto.
    const peso = (r) => (r.opcao ? 0 : normalizar(r.tipoReceita) === normalizar(nome) ? 1 : 2);
    lista.sort((a, b) => peso(a) - peso(b) || a.nome.localeCompare(b.nome, 'pt-BR'));
    return [...(componente.obrigatorio ? [] : [SEM]), ...lista];
  }, [componente, todas, nome]);

  async function escolher(item) {
    if (item === SEM) return onEscolher(null);
    if (item.opcao) return onEscolher(item.id);
    await acrescentarAoProduto(item.id);
  }

  // Acrescenta a receita como opção do componente e já a seleciona.
  async function acrescentarAoProduto(receitaId) {
    setSalvando(true);
    try {
      const body = produtoParaBody(produto);
      const c = body.componentes.find((x) => x.id === componente.id);
      if (!c.opcoes.some((o) => o.receitaId === receitaId)) {
        c.opcoes.push({ receitaId, precoAdicional: '0', padrao: false });
      }
      const atualizado = await produtosApi.atualizar(produto.id, body);
      toast.ok(`Adicionada às opções de ${nomeMin} de ${produto.nome}`);
      onEscolher(receitaId, atualizado);
    } catch (e) {
      if (/fator/i.test(e.message)) {
        // Falta o fator por tamanho: abre a receita para completar e tenta de novo ao salvar.
        toast.info(`Informe o fator por tamanho desta receita para usar no ${produto.nome}`);
        setCorrigir(receitaId);
      } else {
        toast.erro(e);
      }
    } finally {
      setSalvando(false);
    }
  }

  const grupo = (r) =>
    r === SEM ? ' ' : r.opcao ? `Opções de ${nomeMin}` : normalizar(r.tipoReceita) === normalizar(nome) ? `Outras receitas de ${nomeMin}` : 'Outras receitas';

  return (
    <>
      <Sheet aberto={aberto && !nova && !corrigir} onFechar={onFechar} titulo={nome} alta>
        {!todas || salvando ? (
          <Carregando />
        ) : (
          <ListaBusca
            itens={itens}
            texto={(r) => (r === SEM ? `sem ${nome}` : `${r.nome} ${r.tipoReceita}`)}
            grupo={grupo}
            placeholder={`Buscar ${nomeMin}…`}
            onSelecionar={escolher}
            acao={(termo) => (
              <button type="button" className="btn btn-contorno btn-bloco" onClick={() => setNova(termo || true)}>
                <Plus size={18} /> Cadastrar {termo ? `“${termo}”` : `nova receita de ${nomeMin}`}
              </button>
            )}
            renderItem={(r) => {
              if (r === SEM) {
                return (
                  <>
                    <span className="avatar"><CircleSlash size={18} /></span>
                    <span className="cresce negrito">Sem {nomeMin}</span>
                    {!selecionada && <Check size={20} color="var(--rosa)" />}
                  </>
                );
              }
              const ativa = selecionada === r.id;
              return (
                <>
                  <span className="avatar">{iniciais(r.nome)}</span>
                  <span className="cresce">
                    <span className="negrito" style={{ display: 'block' }}>{r.nome}</span>
                    <span className="suave">
                      {r.opcao
                        ? Number(r.opcao.precoAdicional) > 0 ? `+ ${dinheiro(r.opcao.precoAdicional)}` : r.tipoReceita
                        : `${r.tipoReceita} · toque para usar`}
                    </span>
                  </span>
                  {ativa && <Check size={20} color="var(--rosa)" aria-label="Selecionada" />}
                </>
              );
            }}
          />
        )}
      </Sheet>
      <ReceitaFormSheet
        aberto={aberto && Boolean(nova)}
        titulo={`Nova receita de ${nomeMin}`}
        tipoInicial={nome}
        nomeInicial={typeof nova === 'string' ? nova : ''}
        onFechar={() => setNova(false)}
        onSalvo={(r) => { setNova(false); acrescentarAoProduto(r.id); }}
      />
      <ReceitaFormSheet
        aberto={aberto && Boolean(corrigir)}
        titulo="Completar receita"
        receitaId={corrigir}
        onFechar={() => setCorrigir(null)}
        onSalvo={() => { const id = corrigir; setCorrigir(null); acrescentarAoProduto(id); }}
      />
    </>
  );
}
