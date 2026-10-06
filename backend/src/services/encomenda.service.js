import { withTransaction, pool } from '../database/pool.js';
import * as repo from '../repositories/encomenda.repository.js';
import * as produtoRepo from '../repositories/produto.repository.js';
import * as estoqueRepo from '../repositories/estoque.repository.js';
import { calcularItens, consolidar, formatarConsolidado } from './calculo.service.js';
import { toCamel } from '../utils/case.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { dec, toApi, toDb } from '../utils/decimal.js';

// ---------------------------------------------------------------------
// Transições de status permitidas
// ---------------------------------------------------------------------
const TRANSICOES = {
  orcamento: ['confirmada', 'cancelada'],
  confirmada: ['orcamento', 'em_producao', 'cancelada'],
  em_producao: ['pronta', 'cancelada'],
  pronta: ['entregue'],
  entregue: [],
  cancelada: ['orcamento'],
};

// Status em que o snapshot vale (a encomenda já foi confirmada).
const COM_SNAPSHOT = ['confirmada', 'em_producao', 'pronta', 'entregue'];

// ---------------------------------------------------------------------
// Consulta
// ---------------------------------------------------------------------
export async function listar(filtro) {
  return (await repo.listar(filtro)).map(toCamel);
}

async function montarItensResposta(encomendaIds, db) {
  const itens = await repo.listarItens(encomendaIds, db);
  const comps = await repo.listarComponentesDosItens(itens.map((i) => i.id), db);
  return itens.map((i) => ({
    ...toCamel(i),
    componentes: comps
      .filter((c) => c.item_id === i.id)
      .map((c) => ({ componenteId: c.componente_id, componente: c.componente, receitaId: c.receita_id, receita: c.receita })),
  }));
}

export async function buscar(id, db = pool) {
  const e = await repo.buscar(id, db);
  if (!e) throw notFound('Encomenda não encontrada');
  return {
    ...toCamel(e),
    itens: (await montarItensResposta([id], db)).map(({ encomendaId, ...resto }) => resto),
    historico: (await repo.historico(id, db)).map(toCamel),
  };
}

// ---------------------------------------------------------------------
// Validação e montagem dos itens
// ---------------------------------------------------------------------
async function prepararItens(itensEntrada, conn) {
  const produtoIds = [...new Set(itensEntrada.map((i) => i.produtoId))];
  const [produtos] = await conn.query(
    'SELECT id, nome, tipo, modo_calculo, preco_base, ativo FROM produto WHERE id IN (?)',
    [produtoIds],
  );
  const prodMap = new Map(produtos.map((p) => [p.id, p]));
  const componentes = await produtoRepo.listarComponentes(produtoIds, conn);
  const opcoes = await produtoRepo.listarOpcoes(componentes.map((c) => c.id), conn);
  const [tamanhos] = await conn.query(
    'SELECT produto_id, tamanho_id, preco FROM produto_tamanho WHERE produto_id IN (?)',
    [produtoIds],
  );

  const erros = [];
  const itens = itensEntrada.map((entrada, idx) => {
    const n = `Item ${idx + 1}`;
    const p = prodMap.get(entrada.produtoId);
    if (!p) return erros.push(`${n}: produto ${entrada.produtoId} não existe`), null;
    if (!p.ativo) erros.push(`${n}: produto "${p.nome}" está inativo`);

    // Tamanho
    let precoTamanho = null;
    if (p.modo_calculo === 'tamanho') {
      const t = tamanhos.find((t) => t.produto_id === p.id && t.tamanho_id === entrada.tamanhoId);
      if (!entrada.tamanhoId) erros.push(`${n}: "${p.nome}" exige tamanho`);
      else if (!t) erros.push(`${n}: tamanho ${entrada.tamanhoId} não é oferecido para "${p.nome}"`);
      else precoTamanho = t.preco;
    } else if (entrada.tamanhoId) {
      erros.push(`${n}: "${p.nome}" não usa tamanho`);
    }

    // Componentes: escolhidos ou padrão
    const compsProduto = componentes.filter((c) => c.produto_id === p.id);
    const escolhidos = new Map((entrada.componentes ?? []).map((c) => [c.componenteId, c.receitaId]));
    for (const cid of escolhidos.keys()) {
      if (!compsProduto.some((c) => c.id === cid)) erros.push(`${n}: componente ${cid} não pertence a "${p.nome}"`);
    }
    let adicional = dec(0);
    const comps = [];
    for (const c of compsProduto) {
      const ops = opcoes.filter((o) => o.componente_id === c.id);
      const receitaId = escolhidos.get(c.id) ?? ops.find((o) => o.padrao)?.receita_id ?? null;
      if (receitaId == null) {
        if (c.obrigatorio) erros.push(`${n}: escolha a receita de "${c.nome}"`);
        continue;
      }
      const op = ops.find((o) => o.receita_id === receitaId);
      if (!op) {
        erros.push(`${n}: receita ${receitaId} não é opção de "${c.nome}"`);
        continue;
      }
      adicional = adicional.plus(op.preco_adicional);
      comps.push({ componenteId: c.id, receitaId });
    }

    // Preço: informado, ou (preço do tamanho | preço base) + adicionais
    const base = p.modo_calculo === 'tamanho' ? precoTamanho : p.preco_base;
    const precoUnitario = entrada.precoUnitario ?? (base == null ? null : toDb(dec(base).plus(adicional), 2));

    return {
      produtoId: p.id,
      tamanhoId: entrada.tamanhoId ?? null,
      quantidade: entrada.quantidade,
      precoUnitario,
      observacoes: entrada.observacoes ?? null,
      componentes: comps,
    };
  });
  if (erros.length) throw badRequest('Itens inválidos', erros);

  const comPreco = itens.filter((i) => i.precoUnitario != null);
  const valorTotal = comPreco.length
    ? toDb(comPreco.reduce((s, i) => s.plus(dec(i.quantidade).mul(i.precoUnitario)), dec(0)), 2)
    : null;
  return { itens, valorTotal };
}

async function validarCliente(clienteId, conn) {
  const [[c]] = await conn.query('SELECT id FROM cliente WHERE id = ?', [clienteId]);
  if (!c) throw badRequest('Cliente não encontrado');
}

async function gravarItens(encomendaId, itens, conn) {
  for (const i of itens) {
    const itemId = await repo.inserirItem(encomendaId, i, conn);
    await repo.inserirComponentesDoItem(itemId, i.componentes, conn);
  }
}

// ---------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------
export async function criar(dados) {
  return withTransaction(async (conn) => {
    await validarCliente(dados.clienteId, conn);
    const { itens, valorTotal } = await prepararItens(dados.itens, conn);
    const id = await repo.inserir({ ...dados, valorTotal: dados.valorTotal ?? valorTotal }, conn);
    await gravarItens(id, itens, conn);
    return buscar(id, conn);
  });
}

// Só orçamentos podem ser editados. Para mudar uma encomenda confirmada,
// volte-a para 'orcamento' (PATCH /status) — o snapshot é descartado.
export async function atualizar(id, dados) {
  return withTransaction(async (conn) => {
    const atual = await repo.buscar(id, conn, { bloquear: true });
    if (!atual) throw notFound('Encomenda não encontrada');
    if (atual.status !== 'orcamento') {
      throw conflict('Só encomendas em orçamento podem ser editadas. Volte o status para "orcamento" primeiro.');
    }
    await validarCliente(dados.clienteId, conn);
    const { itens, valorTotal } = await prepararItens(dados.itens, conn);
    await repo.atualizar(id, { ...dados, valorTotal: dados.valorTotal ?? valorTotal }, conn);
    await repo.excluirItens(id, conn);
    await gravarItens(id, itens, conn);
    return buscar(id, conn);
  });
}

export async function excluir(id) {
  return withTransaction(async (conn) => {
    const atual = await repo.buscar(id, conn, { bloquear: true });
    if (!atual) throw notFound('Encomenda não encontrada');
    if (!['orcamento', 'cancelada'].includes(atual.status) || atual.estoque_baixado_em) {
      throw conflict('Só orçamentos ou encomendas canceladas sem baixa de estoque podem ser excluídos');
    }
    await repo.excluir(id, conn);
  });
}

// ---------------------------------------------------------------------
// Cálculo de ingredientes
// ---------------------------------------------------------------------

// Monta a estrutura esperada por calcularItens a partir do banco.
export async function carregarItensParaCalculo(encomendaIds, db = pool) {
  const itens = await repo.listarItens(encomendaIds, db);
  const comps = await repo.listarComponentesDosItens(itens.map((i) => i.id), db);
  return itens.map((i) => ({
    itemId: i.id,
    encomendaId: i.encomenda_id,
    modoCalculo: i.modo_calculo,
    tamanhoId: i.tamanho_id,
    tamanho: i.tamanho,
    quantidade: i.quantidade,
    componentes: comps
      .filter((c) => c.item_id === i.id)
      .map((c) => ({
        componenteId: c.componente_id,
        receitaId: c.receita_id,
        quantidadePorUnidade: c.quantidade_por_unidade,
      })),
  }));
}

// Linhas de necessidade: snapshot (confirmadas+) ou cálculo atual (orçamento).
export async function linhasNecessidade(encomenda, db = pool) {
  if (COM_SNAPSHOT.includes(encomenda.status) || encomenda.confirmada_em) {
    const snap = await repo.listarNecessidades([encomenda.id], db);
    if (snap.length) {
      return {
        origem: 'snapshot',
        linhas: snap.map((s) => ({
          encomendaId: s.encomenda_id,
          itemId: s.item_id,
          componenteId: s.componente_id,
          receitaId: s.receita_id,
          receitaNome: s.receita_nome,
          fatorEscala: dec(s.fator_escala),
          ingredienteId: s.ingrediente_id,
          unidadeId: s.unidade_id,
          quantidade: dec(s.quantidade),
        })),
      };
    }
  }
  return { origem: 'calculo_atual', linhas: await calcularItens(await carregarItensParaCalculo([encomenda.id], db), db) };
}

export async function ingredientes(id) {
  const e = await repo.buscar(id);
  if (!e) throw notFound('Encomenda não encontrada');
  const { origem, linhas } = await linhasNecessidade(e);

  // Detalhe por item/receita
  const itens = await montarItensResposta([id], pool);
  const porReceita = new Map();
  for (const l of linhas) {
    const k = `${l.itemId}:${l.componenteId}:${l.receitaId}`;
    if (!porReceita.has(k)) {
      const item = itens.find((i) => i.id === l.itemId);
      porReceita.set(k, {
        itemId: l.itemId,
        produto: item?.produto,
        tamanho: item?.tamanho ?? null,
        quantidadeItem: item?.quantidade,
        componente: item?.componentes.find((c) => c.componenteId === l.componenteId)?.componente ?? null,
        receitaId: l.receitaId,
        receita: l.receitaNome,
        fatorEscala: toApi(l.fatorEscala, 6),
        linhas: [],
      });
    }
    porReceita.get(k).linhas.push(l);
  }
  const detalhado = [];
  for (const r of porReceita.values()) {
    const { linhas: ls, ...resto } = r;
    detalhado.push({ ...resto, ingredientes: await formatarConsolidado(consolidar(ls)) });
  }

  return {
    encomendaId: id,
    status: e.status,
    origem, // 'snapshot' (congelado na confirmação) ou 'calculo_atual'
    consolidado: await formatarConsolidado(consolidar(linhas)),
    detalhado,
  };
}

// ---------------------------------------------------------------------
// Mudança de status (com efeitos em snapshot e estoque)
// ---------------------------------------------------------------------
export async function alterarStatus(id, { status: novo, observacao }) {
  return withTransaction(async (conn) => {
    const e = await repo.buscar(id, conn, { bloquear: true });
    if (!e) throw notFound('Encomenda não encontrada');
    if (e.status === novo) throw badRequest(`A encomenda já está com status "${novo}"`);
    if (!TRANSICOES[e.status].includes(novo)) {
      throw conflict(
        `Não é possível passar de "${e.status}" para "${novo}". Permitido: ${TRANSICOES[e.status].join(', ') || 'nenhum'}`,
      );
    }

    const campos = { status: novo, confirmadaEm: e.confirmada_em, estoqueBaixadoEm: e.estoque_baixado_em };
    const avisos = [];

    if (novo === 'confirmada') {
      // Congela o cálculo: alterações futuras nas receitas não afetam esta encomenda.
      const linhas = await calcularItens(await carregarItensParaCalculo([id], conn), conn);
      if (!linhas.length) throw badRequest('Encomenda sem itens para confirmar');
      await repo.excluirNecessidades(id, conn);
      await repo.inserirNecessidades(
        linhas.map((l) => ({ ...l, fatorEscala: toDb(l.fatorEscala, 6), quantidade: toDb(l.quantidade) })),
        conn,
      );
      campos.confirmadaEm = new Date();
    }

    if (novo === 'orcamento') {
      if (e.estoque_baixado_em) throw conflict('Estoque já foi baixado para esta encomenda; não é possível reabrir');
      await repo.excluirNecessidades(id, conn);
      campos.confirmadaEm = null;
    }

    if (novo === 'em_producao') {
      // Baixa do estoque a partir do snapshot.
      const snap = await repo.listarNecessidades([id], conn);
      const consolidado = consolidar(snap.map((s) => ({ ingredienteId: s.ingrediente_id, unidadeId: s.unidade_id, quantidade: s.quantidade })));
      await estoqueRepo.inserirMovimentacoes(
        consolidado.map((c) => ({
          ingredienteId: c.ingredienteId,
          tipo: 'producao',
          quantidade: toDb(c.quantidade.neg()),
          encomendaId: id,
          observacao: `Produção da encomenda #${id}`,
        })),
        conn,
      );
      campos.estoqueBaixadoEm = new Date();
      const pos = await estoqueRepo.posicao({ ingredienteIds: consolidado.map((c) => c.ingredienteId) }, conn);
      for (const p of pos) {
        if (dec(p.estoque_fisico).isNegative()) {
          avisos.push(`${p.ingrediente}: estoque ficou negativo (${toApi(p.estoque_fisico)} ${p.unidade}). Registre a compra.`);
        }
      }
    }

    if (novo === 'cancelada' && e.estoque_baixado_em) {
      avisos.push('O estoque já havia sido baixado. Se algo puder ser reaproveitado, registre uma entrada ou ajuste.');
    }

    await repo.atualizarStatus(id, campos, conn);
    if (observacao) await repo.anotarUltimoStatus(id, observacao, conn);
    return { ...(await buscar(id, conn)), avisos };
  });
}
