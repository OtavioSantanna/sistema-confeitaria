import { withTransaction } from '../database/pool.js';
import * as repo from '../repositories/ingrediente.repository.js';
import * as estoqueRepo from '../repositories/estoque.repository.js';
import { carregarConversor } from './conversao.service.js';
import { toCamel, rowsToCamel, bools } from '../utils/case.js';
import { badRequest, notFound } from '../utils/errors.js';

const formatar = (row) => bools(toCamel(row), 'ativo', 'abaixoMinimo');

export async function listar(filtro) {
  return (await repo.listar(filtro)).map(formatar);
}

export async function buscar(id, db) {
  const row = await repo.buscar(id, db);
  if (!row) throw notFound('Ingrediente não encontrado');
  return { ...formatar(row), conversoes: rowsToCamel(await repo.listarConversoes(id, db)) };
}

// Garante que todas as receitas que usam o ingrediente continuam
// conversíveis para a unidade de estoque.
async function validarUsos(id, conn) {
  const usos = await repo.usosEmReceitas(id, conn);
  if (!usos.length) return;
  const conversor = await carregarConversor([id], conn);
  const invalidos = usos.filter((u) => conversor.fator(id, u.unidade_id) == null);
  if (invalidos.length) {
    throw badRequest(
      'Unidade incompatível com receitas que usam este ingrediente. Cadastre a conversão correspondente.',
      invalidos.map((u) => ({ receitaId: u.receita_id, receita: u.receita, unidade: u.unidade })),
    );
  }
}

export async function criar(dados) {
  return withTransaction(async (conn) => {
    const id = await repo.inserir(dados, conn);
    await repo.substituirConversoes(id, dados.conversoes, conn);
    if (dados.estoqueInicial && Number(dados.estoqueInicial) > 0) {
      await estoqueRepo.inserirMovimentacoes(
        [{ ingredienteId: id, tipo: 'entrada', quantidade: dados.estoqueInicial, observacao: 'Estoque inicial' }],
        conn,
      );
    }
    return buscar(id, conn);
  });
}

export async function atualizar(id, dados) {
  return withTransaction(async (conn) => {
    const atual = await repo.buscar(id, conn);
    if (!atual) throw notFound('Ingrediente não encontrado');
    if (atual.unidade_estoque_id !== dados.unidadeEstoqueId && (await repo.contarMovimentacoes(id, conn)) > 0) {
      throw badRequest(
        'Não é possível trocar a unidade de estoque de um ingrediente que já tem movimentações. Crie um novo ingrediente.',
      );
    }
    await repo.atualizar(id, dados, conn);
    if (dados.conversoes !== undefined) await repo.substituirConversoes(id, dados.conversoes, conn);
    await validarUsos(id, conn);
    return buscar(id, conn);
  });
}

export async function desativar(id) {
  await buscar(id);
  await repo.desativar(id);
}
