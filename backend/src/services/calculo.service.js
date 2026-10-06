// =====================================================================
// Cálculo de ingredientes — núcleo da regra de negócio.
//
// Para cada item de encomenda e cada componente escolhido:
//   fator (modo 'tamanho')    = fator(receita, tamanho) x quantidade
//   fator (modo 'rendimento') = quantidade x qtd_por_unidade / rendimento
//   quantidade do ingrediente = qtd na receita, convertida para a unidade
//                               de estoque, x fator
// Depois agrupa por ingrediente. Tudo com decimal.js (sem float).
// =====================================================================
import { pool } from '../database/pool.js';
import * as receitaRepo from '../repositories/receita.repository.js';
import { carregarConversor } from './conversao.service.js';
import { dec, toApi } from '../utils/decimal.js';
import { badRequest } from '../utils/errors.js';

// Carrega receitas + ingredientes + fatores + conversor para as receitas.
export async function carregarBase(receitaIds, db = pool) {
  const ids = [...new Set(receitaIds)];
  if (!ids.length) return { receitas: new Map(), fatores: new Map(), conversor: await carregarConversor([], db) };

  const [receitas] = await db.query(
    'SELECT id, nome, rendimento_quantidade FROM receita WHERE id IN (?)',
    [ids],
  );
  const ingredientes = await receitaRepo.listarIngredientes(ids, db);
  const fatores = await receitaRepo.listarFatores(ids, db);

  const mapa = new Map(receitas.map((r) => [r.id, { ...r, ingredientes: [] }]));
  for (const ri of ingredientes) mapa.get(ri.receita_id).ingredientes.push(ri);

  return {
    receitas: mapa,
    fatores: new Map(fatores.map((f) => [`${f.receita_id}:${f.tamanho_id}`, dec(f.fator)])),
    conversor: await carregarConversor(ingredientes.map((i) => i.ingrediente_id), db),
  };
}

// Aplica um fator a uma receita. Retorna linhas por ingrediente
// (quantidade já na unidade de estoque) ou lança erro de conversão.
export function expandirReceita(receita, fator, conversor) {
  const erros = [];
  const linhas = receita.ingredientes.map((ri) => {
    const base = conversor.paraEstoque(ri.ingrediente_id, ri.quantidade, ri.unidade_id);
    if (base == null) {
      erros.push(`${receita.nome}: ${ri.ingrediente} em "${ri.unidade}" não converte para "${ri.unidade_estoque}"`);
      return null;
    }
    return {
      ingredienteId: ri.ingrediente_id,
      unidadeId: ri.unidade_estoque_id,
      quantidade: base.mul(fator),
    };
  });
  if (erros.length) throw badRequest('Conversão de unidade não cadastrada', erros);
  return linhas;
}

// itens: [{ itemId, encomendaId, produto, modoCalculo, tamanhoId, tamanho, quantidade,
//           componentes: [{ componenteId, componente, receitaId, quantidadePorUnidade }] }]
// Retorna linhas detalhadas (uma por item x componente x ingrediente).
export async function calcularItens(itens, db = pool) {
  const receitaIds = itens.flatMap((i) => i.componentes.map((c) => c.receitaId));
  const { receitas, fatores, conversor } = await carregarBase(receitaIds, db);

  const erros = [];
  const linhas = [];
  for (const item of itens) {
    for (const comp of item.componentes) {
      const receita = receitas.get(comp.receitaId);
      let fator;
      if (item.modoCalculo === 'tamanho') {
        const f = fatores.get(`${comp.receitaId}:${item.tamanhoId}`);
        if (!f) {
          erros.push(`Receita "${receita.nome}" não tem fator para o tamanho "${item.tamanho ?? item.tamanhoId}"`);
          continue;
        }
        fator = f.mul(item.quantidade);
      } else {
        fator = dec(item.quantidade).mul(comp.quantidadePorUnidade).div(receita.rendimento_quantidade);
      }
      try {
        for (const l of expandirReceita(receita, fator, conversor)) {
          linhas.push({
            encomendaId: item.encomendaId,
            itemId: item.itemId,
            componenteId: comp.componenteId,
            receitaId: receita.id,
            receitaNome: receita.nome,
            fatorEscala: fator,
            ...l,
          });
        }
      } catch (e) {
        erros.push(...(e.detalhes ?? [e.message]));
      }
    }
  }
  if (erros.length) throw badRequest('Não foi possível calcular os ingredientes', erros);
  return linhas;
}

// Agrupa linhas por ingrediente. `nomes` = Map ingredienteId -> {nome, unidade}.
export function consolidar(linhas) {
  const mapa = new Map();
  for (const l of linhas) {
    const atual = mapa.get(l.ingredienteId);
    if (atual) atual.quantidade = atual.quantidade.plus(l.quantidade);
    else mapa.set(l.ingredienteId, { ingredienteId: l.ingredienteId, unidadeId: l.unidadeId, quantidade: dec(l.quantidade) });
  }
  return [...mapa.values()];
}

// Enriquecer com nome/unidade e formatar para a API.
export async function formatarConsolidado(consolidado, db = pool) {
  if (!consolidado.length) return [];
  const [ings] = await db.query(
    `SELECT i.id, i.nome, u.codigo AS unidade, u.casas_decimais
       FROM ingrediente i JOIN unidade_medida u ON u.id = i.unidade_estoque_id
      WHERE i.id IN (?)`,
    [consolidado.map((c) => c.ingredienteId)],
  );
  const info = new Map(ings.map((i) => [i.id, i]));
  return consolidado
    .map((c) => ({
      ingredienteId: c.ingredienteId,
      ingrediente: info.get(c.ingredienteId).nome,
      unidade: info.get(c.ingredienteId).unidade,
      quantidade: toApi(c.quantidade),
    }))
    .sort((a, b) => a.ingrediente.localeCompare(b.ingrediente, 'pt-BR'));
}
