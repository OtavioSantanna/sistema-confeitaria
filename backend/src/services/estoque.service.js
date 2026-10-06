import { withTransaction } from '../database/pool.js';
import * as repo from '../repositories/estoque.repository.js';
import { carregarConversor } from './conversao.service.js';
import { toCamel, bools } from '../utils/case.js';
import { badRequest, notFound } from '../utils/errors.js';
import { dec, toDb } from '../utils/decimal.js';

export async function posicao(filtro) {
  return (await repo.posicao(filtro)).map((r) => bools(toCamel(r), 'ativo', 'abaixoMinimo'));
}

export async function listarMovimentacoes(filtro) {
  return (await repo.listarMovimentacoes(filtro)).map(toCamel);
}

// Entrada, saída, perda ou ajuste manual.
//   quantidade: positiva para entrada/saida/perda (o sinal é aplicado aqui);
//               com sinal para ajuste (+ sobra, - falta).
//   unidadeId:  opcional; se informado, converte para a unidade de estoque.
export async function registrar(dados) {
  return withTransaction(async (conn) => {
    const conversor = await carregarConversor([dados.ingredienteId], conn);
    const ing = conversor.ingrediente(dados.ingredienteId);
    if (!ing) throw notFound('Ingrediente não encontrado');

    const unidadeId = dados.unidadeId ?? ing.unidade_estoque_id;
    const convertida = conversor.paraEstoque(dados.ingredienteId, dados.quantidade, unidadeId);
    if (convertida == null) throw badRequest('Unidade incompatível com a unidade de estoque do ingrediente');

    let q = convertida;
    if (dados.tipo === 'entrada') q = q.abs();
    else if (dados.tipo === 'saida' || dados.tipo === 'perda') q = q.abs().neg();
    if (q.isZero()) throw badRequest('Quantidade não pode ser zero');

    await repo.inserirMovimentacoes(
      [{
        ingredienteId: dados.ingredienteId,
        tipo: dados.tipo,
        quantidade: toDb(q),
        quantidadeInformada: toDb(dec(dados.quantidade)),
        unidadeInformadaId: unidadeId,
        custoTotal: dados.custoTotal ?? null,
        dataMovimento: dados.dataMovimento ?? new Date(),
        observacao: dados.observacao,
      }],
      conn,
    );
    const [pos] = await repo.posicao({ ingredienteIds: [dados.ingredienteId] }, conn);
    return bools(toCamel(pos), 'ativo', 'abaixoMinimo');
  });
}
