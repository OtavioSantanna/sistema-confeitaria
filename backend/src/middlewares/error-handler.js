import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export function notFound(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada' });
}

// Traduz erros do MySQL mais comuns para respostas úteis.
function mysqlError(err) {
  switch (err.code) {
    case 'ER_DUP_ENTRY':
      return new AppError(409, 'Já existe um registro com esses dados (nome duplicado?)');
    case 'ER_ROW_IS_REFERENCED_2':
      return new AppError(409, 'Registro em uso por outros cadastros; desative-o em vez de excluir');
    case 'ER_NO_REFERENCED_ROW_2':
      return new AppError(400, 'Referência inválida: algum id informado não existe');
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return new AppError(400, 'Valor inválido (regra do banco violada)');
    case 'ER_SIGNAL_EXCEPTION':
      return new AppError(400, err.sqlMessage);
    default:
      return null;
  }
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      detalhes: err.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
    });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição' });
  }
  const e = err instanceof AppError ? err : mysqlError(err);
  if (e) {
    return res.status(e.status).json({ erro: e.message, ...(e.detalhes && { detalhes: e.detalhes }) });
  }
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
}
